import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const PROMPT = `You are a receipt OCR expert. Analyse this receipt image and extract all the data you can see.

Return ONLY a raw JSON object. No markdown. No code fences. No explanation. Just JSON.

Format:
{"store_name":"string or null","date":"YYYY-MM-DD or null","total":0.00,"items":[{"description":"item name","unit_price":0.00,"quantity":1,"total_amount":0.00}]}

Rules:
- Extract every product line you can see on the receipt
- Prices are plain numbers only (no pound or dollar symbol)
- If quantity is not visible, default to 1
- Skip: tax lines, subtotals, discounts, card/cash payment lines
- Use null for any field you cannot read`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image: base64Image, mimeType = 'image/jpeg' } = body as {
      image: string
      mimeType?: string
    }

    if (!base64Image) {
      return NextResponse.json(
        { ...empty(), _debug: 'No image data in request body' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('[OCR] GEMINI_API_KEY not set')
      return NextResponse.json({
        ...empty(),
        _debug: 'GEMINI_API_KEY not set in environment',
      })
    }

    const sizeKb = Math.round((base64Image.length * 3) / 4 / 1024)
    console.log(`[OCR] Image received: ~${sizeKb}KB, mimeType: ${mimeType}`)

    const MODELS_TO_TRY = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-preview-05-20',
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash-latest',
    ]

    let lastResult: GeminiResult | null = null

    for (const model of MODELS_TO_TRY) {
      const result = await callGemini(apiKey, model, base64Image, mimeType)
      lastResult = result

      if (result.type === 'success') {
        console.log(
          `[OCR] Success via ${model}: ${result.data.items.length} items, store: "${result.data.store_name}"`
        )
        return NextResponse.json(result.data)
      }

      if (result.type === 'http_error') {
        console.log(`[OCR] ${model} HTTP ${result.status} — trying next model`)
        continue
      }

      console.error(`[OCR] ${model} failed (${result.type}), stopping`)
      break
    }

    console.error('[OCR] All models failed. Last result:', lastResult)
    return NextResponse.json({
      ...empty(),
      _debug: `All models failed. Last: ${JSON.stringify(lastResult).slice(0, 300)}`,
    })
  } catch (err: any) {
    console.error('[OCR] Unexpected error:', err)
    return NextResponse.json({
      ...empty(),
      _debug: `Server error: ${err.message}`,
    })
  }
}

interface OcrItem {
  description: string
  unit_price: number | null
  total_amount: number | null
  quantity: number
}

interface OcrResult {
  store_name: string | null
  date: string | null
  total: number | null
  items: OcrItem[]
}

type GeminiResult =
  | { type: 'success'; data: OcrResult }
  | { type: 'timeout' }
  | { type: 'http_error'; status: number; body: string }
  | { type: 'parse_error'; raw: string }
  | { type: 'error'; message: string }

async function callGemini(
  apiKey: string,
  model: string,
  base64Image: string,
  mimeType: string
): Promise<GeminiResult> {
  console.log(`[OCR] Calling ${model}...`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 8000)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: PROMPT },
                { inline_data: { mime_type: mimeType, data: base64Image } },
              ],
            },
          ],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 },
        }),
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const body = await response.text()
      console.error(`[OCR] ${model} HTTP ${response.status}:`, body.slice(0, 200))
      return { type: 'http_error', status: response.status, body: body.slice(0, 200) }
    }

    const data = await response.json()
    const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    console.log(`[OCR] ${model} response (${rawText.length} chars):`, rawText.slice(0, 200))

    if (!rawText.trim()) {
      return { type: 'parse_error', raw: '(empty)' }
    }

    const parsed = extractJson(rawText)
    if (!parsed) {
      console.error(`[OCR] JSON parse failed. Raw:`, rawText.slice(0, 200))
      return { type: 'parse_error', raw: rawText.slice(0, 200) }
    }

    return {
      type: 'success',
      data: {
        store_name: typeof parsed.store_name === 'string' ? parsed.store_name : null,
        date: typeof parsed.date === 'string' ? parsed.date : null,
        total: typeof parsed.total === 'number' ? parsed.total : null,
        items: Array.isArray(parsed.items)
          ? parsed.items.map((item: any) => ({
              description: String(item.description || ''),
              unit_price: typeof item.unit_price === 'number' ? item.unit_price : null,
              total_amount: typeof item.total_amount === 'number' ? item.total_amount : null,
              quantity: Number(item.quantity) || 1,
            }))
          : [],
      },
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      console.error(`[OCR] ${model} timed out after 8s`)
      return { type: 'timeout' }
    }
    console.error(`[OCR] ${model} threw:`, err.message)
    return { type: 'error', message: err.message }
  }
}

function extractJson(text: string): any | null {
  const stripped = text.trim()
  const fenceMatch = stripped.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenceMatch ? fenceMatch[1].trim() : stripped

  try {
    return JSON.parse(candidate)
  } catch {}

  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start === -1 || end <= start) return null

  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {}

  return null
}

function empty() {
  return {
    store_name: null,
    date: new Date().toISOString().split('T')[0],
    total: null,
    items: [],
  }
}

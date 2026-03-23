# Housekeeper — Setup Guide

This guide walks you through getting the app running from zero.
Estimated time: **30–45 minutes**.

---

## What you'll need to set up (all free)

1. **Node.js** — runs the app on your computer
2. **Supabase account** — your database + login system
3. **Vercel account** — hosts the app online
4. **Mindee account** — reads your receipts (free tier: 250 pages/month)

---

## Step 1: Install Node.js

1. Go to **https://nodejs.org**
2. Download the **LTS** version (the one that says "Recommended for most users")
3. Run the installer — just click Next through everything
4. To verify it worked: open **Terminal** (Mac) or **Command Prompt** (Windows)
5. Type `node --version` and press Enter — you should see a version number like `v20.x.x`

---

## Step 2: Set up Supabase (your database)

1. Go to **https://supabase.com** and click "Start your project"
2. Sign up with GitHub or email
3. Click **"New project"**
   - Give it a name: `housekeeper`
   - Set a strong database password (save this somewhere!)
   - Choose region: **Europe West (London)** (closest to Beckenham)
   - Click "Create new project" and wait ~2 minutes
4. Once ready, go to **SQL Editor** (left sidebar)
5. Click **"New query"**
6. Open the file `supabase/schema.sql` from this project folder
7. Copy ALL the contents and paste them into the SQL editor
8. Click **"Run"** — you should see "Success" messages
9. Go to **Settings → API** (left sidebar)
10. Copy these two values — you'll need them later:
    - **Project URL** (looks like `https://xxxxx.supabase.co`)
    - **anon public key** (long string starting with `eyJ...`)

---

## Step 3: Set up Mindee (receipt scanning)

1. Go to **https://mindee.com** and sign up (free)
2. In the dashboard, go to **API Keys**
3. Create a new API key and copy it

> **Note:** Mindee free tier gives you 250 pages/month — plenty for a family!
> If you skip this step, the app will still work but OCR won't extract items automatically — you'll add them manually.

---

## Step 4: Set up Vercel (hosting)

1. Go to **https://vercel.com** and sign up with GitHub
2. Keep this tab open — you'll come back to it in Step 6

---

## Step 5: Configure the app

1. In the project folder, find the file called `.env.local.example`
2. **Duplicate** this file and rename the copy to `.env.local`
3. Open `.env.local` in any text editor (Notepad works)
4. Fill in your values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
MINDEE_API_KEY=your-mindee-api-key
```

Save the file.

---

## Step 6: Run locally (to test before deploying)

Open **Terminal** / **Command Prompt**, navigate to the project folder:

```bash
# Go into the project folder (adjust path as needed)
cd ~/Downloads/household-tracker

# Install dependencies (first time only — takes ~1 minute)
npm install

# Start the app
npm run dev
```

Open your browser and go to **http://localhost:3000** — you should see the login screen!

Test it out:
- Create an account
- Set up your household
- Try scanning a receipt

---

## Step 7: Deploy to Vercel (put it online)

Once you're happy with the app locally:

1. Install the Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. In the project folder, run:
   ```bash
   vercel
   ```

3. Follow the prompts:
   - Link to your Vercel account: **Y**
   - Set up new project: **Y**
   - Project name: `housekeeper` (or anything you like)
   - Root directory: leave blank (just press Enter)

4. After first deploy, add your environment variables in Vercel:
   - Go to **vercel.com → your project → Settings → Environment Variables**
   - Add the three variables from your `.env.local` file

5. Redeploy:
   ```bash
   vercel --prod
   ```

6. Vercel gives you a URL like `https://housekeeper-xxx.vercel.app` — **open this on your phone and tap "Add to Home Screen"** to install it as a PWA!

---

## Step 8: Add to Home Screen (iPhone)

1. Open the Vercel URL in **Safari** on your iPhone
2. Tap the **Share** button (box with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap "Add"

The app will appear on your home screen and behave like a native app 🎉

---

## Importing your existing data

1. Open your March 2026 Google Sheet
2. Go to each sheet (food, meal, others)
3. **File → Download → CSV** for each sheet
4. In the app, go to **Shopping List → Import from CSV**
5. Upload each CSV and map the columns

> **Tip:** The app auto-detects common column names. If your columns are named "Item", "Price", "Date" etc. — it should map them automatically!

---

## Troubleshooting

**"npm: command not found"** — Node.js isn't installed properly. Restart Terminal after installing and try again.

**"Error: Supabase credentials invalid"** — Double-check your `.env.local` file. Make sure there are no spaces around the `=` signs.

**OCR not working** — Check your Mindee API key. The app will still work — items just won't be auto-extracted.

**"RLS policy violation"** — Make sure you ran the full `schema.sql` in Supabase, including the policy section at the bottom.

---

## App structure at a glance

```
/dashboard    → Monthly spending overview + charts
/scan         → Scan a receipt with your camera
/receipts     → All past receipts
/receipts/[id]→ Receipt detail + price trend
/shopping-list→ Family shopping list
/import       → CSV import from Google Sheets
/settings     → Family members, categories, sign out
```

---

Built with Next.js · Supabase · Mindee · Vercel

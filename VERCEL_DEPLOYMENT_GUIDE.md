# Complete Guide: Deploying Simple Billing (Frontend & Backend) on Vercel

This repository is pre-configured for seamless deployment on [Vercel](https://vercel.com). Because Vercel is a serverless platform, your frontend and backend run as two linked services connected to MongoDB Atlas.

---

## Architecture Overview

```
+---------------------------------+       API Requests       +---------------------------------+
¦     Frontend (Vite + React)     ¦ -----------------------> ¦    Backend (Express Serverless)  ¦
¦  simple-billing-app.vercel.app  ¦  (via VITE_API_URL or    ¦  simple-billing-api.vercel.app  ¦
¦                                 ¦   rewrite)               ¦                                 ¦
+---------------------------------+                          +---------------------------------+
                                                                             ¦
                                                                             ¦ MONGODB_URI
                                                                             ?
                                                             +---------------------------------+
                                                             ¦      MongoDB Atlas (Cloud)      ¦
                                                             ¦   (Free M0 Cluster / Dedicated) ¦
                                                             +---------------------------------+
```

---

## Prerequisites (One-time Setup)

1. **MongoDB Atlas Cloud Database (Free):**
   - Vercel functions cannot connect to `localhost:27017`.
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) &rarr; Create a free **M0 Cluster**.
   - Under **Database Access**, create a database user (e.g., username `admin`, password `<YourPassword>`).
   - Under **Network Access**, click **Add IP Address** &rarr; select **Allow Access from Anywhere** (`0.0.0.0/0`) so Vercel serverless IPs can connect.
   - Click **Connect** &rarr; **Drivers** &rarr; copy your connection string:
     ```
     mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/simple_billing?retryWrites=true&w=majority
     ```

2. **GitHub Account:**
   - Push your `Simple_Billing` repository to GitHub (or GitLab/Bitbucket).

---

## Step 1: Push Code to GitHub

Open terminal in `d:\Development\Simple_Billing`:

```bash
git init
git add .
git commit -m "feat: complete simple billing pos with vercel configuration"
git branch -M main
git remote add origin https://github.com/<your-username>/simple-billing.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New... &rarr; Project**.
2. Select your GitHub repository (`simple-billing`).
3. Configure project settings:
   - **Project Name:** `simple-billing-api` (or any name you prefer)
   - **Framework Preset:** `Other`
   - **Root Directory:** Click `Edit` &rarr; Select **`backend`** &rarr; Click `Continue`.
   - **Build and Output Settings:** Leave default (Build Command: empty, Output Directory: empty).
4. **Environment Variables:**
   Expand the **Environment Variables** section and add:
   | Key | Value | Description |
   |---|---|---|
   | `MONGODB_URI` | `mongodb+srv://admin:...@cluster0.../simple_billing?retryWrites=true&w=majority` | Your Atlas connection string |
   | `JWT_SECRET` | `SimpleBilling_Secure_Key_2026_Retail` | Secret key for JWT |
   | `NODE_ENV` | `production` | Production environment |
5. Click **Deploy**.
6. Once deployment finishes, copy your backend URL (e.g., `https://simple-billing-api.vercel.app`).
   - You can verify it works by visiting: `https://simple-billing-api.vercel.app/api/health` &rarr; should return `{"status":"ok"}`.

---

## Step 3: Deploy Frontend on Vercel

1. In the Vercel Dashboard, click **Add New... &rarr; Project** again.
2. Select the **same** GitHub repository (`simple-billing`).
3. Configure project settings:
   - **Project Name:** `simple-billing` (or any name)
   - **Framework Preset:** `Vite` (Vercel automatically detects Vite)
   - **Root Directory:** Click `Edit` &rarr; Select **`frontend`** &rarr; Click `Continue`.
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
4. **Environment Variables:**
   Expand the **Environment Variables** section and add:
   | Key | Value | Description |
   |---|---|---|
   | `VITE_API_URL` | `https://simple-billing-api.vercel.app` | The backend URL from Step 2 |
5. Click **Deploy**.
6. Once deployed, open your frontend URL (e.g., `https://simple-billing.vercel.app`).

---

## Pre-Configured Files in This Codebase

The following files have already been created and configured in your codebase:

1. **`backend/vercel.json`**:
   - Routes all incoming `/api/*` traffic to `/api/index.js` (serverless function).
2. **`backend/api/index.js`**:
   - Exports the Express app as a Vercel Serverless Function handler.
3. **`backend/src/config/db.js`**:
   - Reuses and caches active MongoDB connections across serverless cold starts.
4. **`frontend/vercel.json`**:
   - Configures single-page application (SPA) rewrites to `/index.html` so client-side routes (`/stock`, `/items`, `/categories`, `/login`) work without 404 errors on refresh.
5. **`frontend/src/main.jsx`**:
   - Automatically uses `import.meta.env.VITE_API_URL` when deployed to point to your live backend.

---

## Option 2: Deploy via Vercel CLI (Alternative to Web Dashboard)

If you prefer deploying directly from your computer terminal:

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Deploy Backend
cd d:\Development\Simple_Billing\backend
vercel
# Follow prompts, set Root Directory: ./, add MONGODB_URI and JWT_SECRET
vercel --prod

# 3. Deploy Frontend
cd d:\Development\Simple_Billing\frontend
vercel
# Follow prompts, set Root Directory: ./, add VITE_API_URL=<backend-url>
vercel --prod
```


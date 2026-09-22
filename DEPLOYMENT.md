# 🚀 Deployment Guide — BPS School ERP

This guide walks you through deploying the **Brindawan Public School (BPS) ERP System** to production using **Render** (Backend API) and **Vercel** (Next.js Frontend).

---

## 🏗️ Architecture Overview

| Component | Technology | Recommended Host | Free Tier Available? |
|---|---|---|---|
| **Backend API** | Node.js + Express + Prisma | [Render](https://render.com) or [Railway](https://railway.app) | Yes |
| **Frontend Web** | Next.js 16 + React 19 + Tailwind | [Vercel](https://vercel.com) | Yes |
| **Database** | SQLite (Default) or PostgreSQL | Built-in SQLite / Render Postgres | Yes |

---

## 📦 Step 1: Push Code to GitHub

Your GitHub repository is:
`https://github.com/SidL340/bpserp.git`

The code is committed to the `main` branch.

---

## ⚙️ Step 2: Deploy Backend to Render

1. Go to **[render.com](https://render.com)** and sign in with your GitHub account.
2. Click **New +** → **Web Service**.
3. Select **"Build and deploy from a Git repository"** and select `SidL340/bpserp`.
4. Configure the Web Service settings:
   - **Name**: `bps-erp-backend`
   - **Region**: Singapore or Frankfurt (choose nearest to Nepal/Asia)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
5. Click **Advanced** → **Add Environment Variable**:
   | Variable | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `5000` | Internal server port |
   | `DATABASE_URL` | `file:./prisma/dev.db` | Or your PostgreSQL URL |
   | `JWT_SECRET` | *(Enter a random secure 32+ character string)* | Auth signing key |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry |
   | `FRONTEND_URL` | `*` *(or your Vercel URL once deployed)* | CORS protection |
   | `SCHOOL_NAME` | `Brindawan Public School` | School branding |
6. Click **Create Web Service**.
7. Once deployed, copy your Render URL: e.g. `https://bps-erp-backend.onrender.com`.
   - Your backend health check will be at: `https://bps-erp-backend.onrender.com/api/health`.

---

## 🎨 Step 3: Deploy Frontend to Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub.
2. Click **"Add New..."** → **Project**.
3. Import the repository `SidL340/bpserp`.
4. Configure Project:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click `Edit` and select `frontend`.
   - **Build Command**: `next build` (default)
   - **Output Directory**: `.next` (default)
5. Under **Environment Variables**, add:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://your-backend-name.onrender.com/api` |
   *(Replace with your actual Render backend URL from Step 2)*
6. Click **Deploy**.
7. Vercel will build and launch the site within ~1 minute!
   - You will get a live URL: e.g. `https://bpserp.vercel.app` (or your custom domain `bps.edu.np`).

---

## 🔄 Step 4: Final Connection (CORS & Uploads)

1. Once your frontend Vercel URL is live (e.g. `https://bpserp.vercel.app`):
   - Go back to Render → your backend service → **Environment**.
   - Set `FRONTEND_URL` = `https://bpserp.vercel.app`.
   - Click **Save Changes** (Render will automatically redeploy with the updated CORS rule).
2. Visit your Vercel URL:
   - Browse the public homepage, notice board, and gallery.
   - Go to `/login` and sign in with your administrator credentials.
   - All data and updates will save directly to your deployed backend!

---

## 🔐 Default Admin Login Credentials

- **URL**: `https://your-frontend.vercel.app/login`
- **Username / Email**: `admin@bps.edu.np` (or `principal@bps.edu.np`)
- **Password**: *(Your configured admin password)*

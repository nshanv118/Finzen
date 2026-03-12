# Backend Deployment Guide (FastAPI + SQLite)

Since Vercel is best for static frontends, your Python backend should be deployed to a service like **Render** or **Railway** for the hackathon. These services persist your database better.

## Option 1: Render.com (Recommended & Free)
1. Sign up/Login to [Render](https://render.com).
2. Click **New +** > **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `finzen-api`
   - **Root Directory**: `backend`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn main:app --host 0.0.0.0 --port 10000`
5. In **Environment Variables**, add:
   - `GEMINI_API_KEY`: (Your Google Gemini Key)
6. Once deployed, Render will give you a URL like `https://finzen-api.onrender.com`.

## After Deployment
1. Go to `frontend/js/api.js`.
2. Replace `'ANY_PROD_URL_HERE'` with your new Render URL.
3. Commit and push:
   ```bash
   git add .
   git commit -m "chore: add production API URL"
   git push origin main
   ```
4. Vercel will automatically redeploy your frontend, and everything will be connected!

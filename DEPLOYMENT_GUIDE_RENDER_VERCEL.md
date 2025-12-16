# Deployment Guide: Render (Backend) & Vercel (Frontend)

This guide outlines the steps to deploy the SmartWallet application using **Render** for the Node.js backend and **Vercel** for the React frontend.

## Prerequisites

1.  **GitHub Repository**: Ensure your code is pushed to a GitHub repository.
2.  **Accounts**:
    *   [Render Account](https://render.com/)
    *   [Vercel Account](https://vercel.com/)
    *   [MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas) (for the database)
    *   [Clerk Account](https://clerk.com/) (for authentication)
    *   [Inflection AI / Google Gemini API Keys](https://inflection.ai/)

---

## Part 1: Database Setup (MongoDB Atlas)

1.  Log in to MongoDB Atlas and create a new cluster (Shared/Free tier is fine for testing).
2.  Create a database user (username and password). **Save these credentials.**
3.  Allow access from anywhere (`0.0.0.0/0`) in Network Access (or specifically allow Render's IPs if you want to be stricter, but `0.0.0.0/0` is easier for initial setup).
4.  Get your connection string:
    *   Click "Connect" -> "Drivers".
    *   Copy the string (e.g., `mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority`).
    *   Replace `<password>` with your actual password.

---

## Part 2: Backend Deployment (Render)

1.  **Create a Web Service**:
    *   Log in to the Render Dashboard.
    *   Click "New +" and select "Web Service".
    *   Connect your GitHub repository.

2.  **Configure Service**:
    *   **Name**: `smartwallet-api` (or similar)
    *   **Region**: Choose one close to you (e.g., Ohio, Frankfurt).
    *   **Branch**: `main` (or your production branch).
    *   **Root Directory**: `server` (Important! The backend code is in this subfolder).
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`

3.  **Environment Variables**:
    *   Scroll down to the "Environment Variables" section and add the following keys. Use the values from your local `.env` or `.env.production` file, but update them for production.

    | Key | Value Description |
    | :--- | :--- |
    | `NODE_ENV` | `production` |
    | `PORT` | `10000` (Render default) |
    | `MONGODB_URI` | Your MongoDB Atlas connection string from Part 1. |
    | `CLERK_PUBLISHABLE_KEY` | Your Clerk Publishable Key (Live). |
    | `CLERK_SECRET_KEY` | Your Clerk Secret Key (Live). |
    | `CLERK_WEBHOOK_SECRET` | Your Clerk Webhook Secret. |
    | `INFLECTION_API_URL` | `https://api.inflection.ai/external/api/inference` |
    | `INFLECTION_API_KEY` | Your Inflection AI API Key. |
    | `GEMINI_API_KEY` | Your Google Gemini API Key (Fallback). |
    | `FRONTEND_URL` | Leave blank for now (we'll update this after deploying Vercel). |

4.  **Deploy**:
    *   Click "Create Web Service".
    *   Render will start building your app. Wait for it to finish.
    *   Once deployed, copy the **Service URL** (e.g., `https://smartwallet-api.onrender.com`).

---

## Part 3: Frontend Deployment (Vercel)

1.  **Import Project**:
    *   Log in to the Vercel Dashboard.
    *   Click "Add New..." -> "Project".
    *   Import your GitHub repository.

2.  **Configure Project**:
    *   **Framework Preset**: Vite
    *   **Root Directory**: `.` (Leave as default, or select the root if asked).
    *   **Build & Output Settings**:
        *   **Build Command**: `npm run build` (Default)
        *   **Output Directory**: `dist` (Default)
        *   **Install Command**: `npm install` (Default)

3.  **Environment Variables**:
    *   Expand the "Environment Variables" section.
    *   Add the following variables. **Note:** In Vite, variables exposed to the client must often be defined in `vite.config.ts` using `define` or prefixed with `VITE_`. However, your project structure uses a `define` block in `vite.config.ts` to map `process.env` variables. Vercel supports this if configured correctly, but standard Vite practice is `VITE_`.
    *   **CRITICAL**: Since your `vite.config.ts` maps `process.env.API_URL` to `env.API_URL`, you must set these in Vercel:

    | Key | Value Description |
    | :--- | :--- |
    | `API_URL` | The Render Backend URL from Part 2 (e.g., `https://smartwallet-api.onrender.com`). **No trailing slash.** |
    | `CLERK_PUBLISHABLE_KEY` | Your Clerk Publishable Key (Live). |
    | `INFLECTION_API_KEY` | Your Inflection AI API Key. |
    | `GEMINI_API_KEY` | Your Google Gemini API Key. |

4.  **Deploy**:
    *   Click "Deploy".
    *   Vercel will build and deploy your frontend.
    *   Once finished, you will get a **Deployment URL** (e.g., `https://smartwallet.vercel.app`).

---

## Part 4: Final Configuration & Connecting the Dots

1.  **Update Backend CORS**:
    *   Go back to your **Render Dashboard** -> `smartwallet-api` -> "Environment".
    *   Add/Update the `FRONTEND_URL` variable.
    *   **Value**: Your Vercel Deployment URL (e.g., `https://smartwallet.vercel.app`).
    *   Render will automatically restart the service to apply the change.

2.  **Update Clerk Allowed Origins**:
    *   Go to your **Clerk Dashboard** -> "API Keys" -> "Allowed Origins" (or CORS settings).
    *   Add your Vercel URL (`https://smartwallet.vercel.app`).

3.  **Verify Connection**:
    *   Open your Vercel URL.
    *   Try to log in.
    *   Check the browser console (F12) to ensure API requests are going to `https://smartwallet-api.onrender.com/...` and not failing with CORS errors.

---

## Troubleshooting

### CORS Errors
*   **Symptom**: API requests fail with "Cross-Origin Request Blocked".
*   **Fix**: Ensure `FRONTEND_URL` in Render matches your Vercel URL exactly (no trailing slash usually best, unless your code expects it). Check `server/index.ts` to see how it handles CORS.

### Build Fails on Render
*   **Symptom**: "Command not found" or missing dependencies.
*   **Fix**: Ensure "Root Directory" is set to `server`. Check that `server/package.json` has all dependencies listed.
*   **Symptom**: TypeScript errors about vitest modules.
*   **Fix**: Already fixed - `tsconfig.build.json` excludes test files from production build.

### Build Fails on Vercel
*   **Symptom**: Missing modules.
*   **Fix**: Ensure you are not importing server-side files (like `server/services/...`) directly into client-side code. All interaction should be via API calls.

### AI Features Not Working
*   **Symptom**: "AI service not configured" or errors in console.
*   **Fix**: Verify `INFLECTION_API_KEY` and `GEMINI_API_KEY` are set in **BOTH** Render (for backend processing) and Vercel (if you have any client-side logic, though best practice is backend-only).

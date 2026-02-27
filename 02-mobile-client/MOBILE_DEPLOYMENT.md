# Nomu Mobile App — Deployment Instructions

Your **web app** (backend + frontend) is already on Render. This guide explains how the **mobile APK** fits in and what to configure so users who download the APK from the Nomu site can log in.

---

## How it works

1. **Nomu website (deployed)**  
   Users visit your site (e.g. nomucafe.onrender.com or nomu.cafe), where they can download the **APK** link.

2. **Mobile APK**  
   When users install and open the app, it does **not** use any `.env` file on the phone. It uses a **built-in backend URL**. In your app that URL is:
   - **`https://nomu-backend.onrender.com/api`**

3. **Backend the APK talks to**  
   So a backend **must** be running at **`nomu-backend.onrender.com`** and must expose the same API the mobile app expects (e.g. `/api/user/login`, `/api/health`, `/api/register`, etc.).

You have two setups:

- **Option A — One backend for web and mobile**  
  Your **web backend** (the one already on Render) is deployed as **nomu-backend.onrender.com**.  
  → Then the APK already points to the right place. You only need to ensure that backend has the same users/DB and API routes the mobile app needs.

- **Option B — Separate mobile backend**  
  You deploy **this** mobile backend (`02-mobile-client/mobile-backend`) as a **second** Render service and set its URL to **nomu-backend.onrender.com** (or change the app’s URL; see step 3 below).  
  → Use the **same** `MONGO_URI` and `JWT_SECRET` as your web backend so web and mobile share the same users.

---

## Step-by-step instructions

### Step 1: Decide which backend the APK uses

- If the **web backend** is already at **nomu-backend.onrender.com** and has the same API as the mobile app (e.g. `/api/user/login`), do nothing to the app URL. Go to step 2.
- If the web backend is at a **different** URL (e.g. `nomucafe-backend.onrender.com`), either:
  - Deploy the **mobile backend** to Render and name the service so its URL is **nomu-backend.onrender.com**, or  
  - Change the mobile app to use your **web backend** URL (step 3) and ensure the web backend exposes the mobile API.

### Step 2: Backend on Render (the one at nomu-backend.onrender.com)

On the Render service that serves **nomu-backend.onrender.com** (web backend or mobile backend):

1. Open the service → **Environment** tab.
2. Set at least:
   - **MONGO_URI** — same as in your web/mobile backend `.env` (so web and mobile use the same users).
   - **JWT_SECRET** — **exactly** the same as in your mobile backend `.env` (so login tokens work).
   - **EMAIL_USER** / **EMAIL_PASS** — for OTP/password reset.
   - **NODE_ENV** = `production`.
   - **PORT** — usually set by Render; if you have a custom one, use that.
3. Save. Render will redeploy. After deploy, test:
   - `https://nomu-backend.onrender.com/api/health`  
   should return OK (or your health response).

If login still fails, check Render logs for errors on `/api/user/login` and confirm MONGO_URI and JWT_SECRET match the app that created the users.

### Step 3: If your backend URL is NOT nomu-backend.onrender.com

Then the APK must use your real backend URL:

1. Open **mobile-frontend**:  
   `02-mobile-client/mobile-frontend/lib/config.dart`
2. Find every **`nomu-backend.onrender.com`** and replace with your actual backend host (no `https://`, no `/api`), e.g. `nomucafe-backend.onrender.com`.
3. Rebuild the APK (step 4) and use the new APK for the download link.

### Step 4: Build the release APK

From your project root:

```bash
cd 02-mobile-client/mobile-frontend
flutter pub get
flutter build apk --release
```

The APK will be at:

`02-mobile-client/mobile-frontend/build/app/outputs/flutter-apk/app-release.apk`

### Step 5: Put the APK on the Nomu site

The **Download Nomu Application** button on the Nomu App page is already wired to the APK:

1. **APK location (current setup)**  
   The built APK has been copied to:  
   `01-web-application/frontend/public/Nomu-Mobile-Application.apk`  
   The button in `01-web-application/frontend/src/client/NomuApp.jsx` points to `/Nomu-Mobile-Application.apk`, so it will be served from the same domain when the frontend is deployed.

2. **Deploy the web frontend**  
   Rebuild and deploy the web frontend so the new APK and button link are live:
   ```bash
   cd 01-web-application/frontend
   npm run build
   ```
   Then deploy the `build` folder to Render (or your host). After deploy, the download URL will be:  
   `https://<your-frontend-domain>/Nomu-Mobile-Application.apk`

3. **When you release a new APK later**  
   - Build the release APK: `cd 02-mobile-client/mobile-frontend` → `flutter build apk --release`
   - Copy the new APK over the old one:  
     `copy 02-mobile-client\mobile-frontend\build\app\outputs\flutter-apk\app-release.apk 01-web-application\frontend\public\Nomu-Mobile-Application.apk`  
     (Windows) or use the same path with `cp` on Mac/Linux.
   - Rebuild the web frontend (`npm run build` in `01-web-application/frontend`) and deploy.

---

## Mobile backend `.env` (this repo)

- The **mobile backend** `.env` file is used only when you **run** the mobile backend (e.g. on your machine or on a server). The **APK does not read this file**.
- For the APK to work you do **not** have to change this file, as long as the backend that is **actually** at `nomu-backend.onrender.com` (or the URL you set in config.dart) has:
  - The same **MONGO_URI** and **JWT_SECRET** as in this `.env` (so same users and auth), and  
  - The same API routes the mobile app expects.

**When to change this `.env`:**

- **Local development**  
  Keep as is. Use it when running `node server.js` (or your start script) locally so the mobile app (run from IDE) can point to your machine if needed.

- **Deploying this mobile backend to Render**  
  Do **not** rely on this file on Render. In Render’s Environment tab, set the same variables (MONGO_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS, NODE_ENV=production, etc.). Use the same MONGO_URI and JWT_SECRET as your web backend so web and mobile share the same users.

---

## Checklist

- [ ] A backend is live at the URL the APK uses (default: **nomu-backend.onrender.com**).
- [ ] That backend has **MONGO_URI** and **JWT_SECRET** set (and same as where your users exist).
- [ ] `https://<that-backend>/api/health` returns OK.
- [ ] If the backend URL is not nomu-backend.onrender.com, **config.dart** was updated and the APK was **rebuilt**.
- [ ] The APK download link on the Nomu site points to the latest **app-release.apk**.

After that, the mobile app linked on the Nomu web application should log in correctly for users who have an account in that same database.

# Web Application vs Mobile – API URL and Database Check

This document compares how the **web application** (admin + client) and the **mobile application** are configured for API URL and database, based on the current codebase.

---

## 1. Database (MongoDB)

| Source | Variable | Value in code / config |
|--------|----------|-------------------------|
| **Web backend** (`01-web-application/backend`) | `process.env.MONGO_URI` | In your `.env`: `mongodb+srv://...@nomudb.batdwqp.mongodb.net/nomucafephdb?...` → database **nomucafephdb** |
| **Mobile backend** (`02-mobile-client/mobile-backend`) | `process.env.MONGO_URI` | No default in `server.js`; read from `.env`. `env-template.txt` suggests `mongodb://localhost:27017/nomu_cafe_mobile`. Some scripts use the same Atlas DB: **nomucafephdb** |

**Conclusion – Database:**  
- If the **mobile backend** `.env` has the same `MONGO_URI` as the web backend (e.g. `...nomucafephdb...`), then **yes, both use the same database**.  
- If the mobile backend uses a different `MONGO_URI` (e.g. `nomu_cafe_mobile` or another Atlas DB), then they use **different databases**.  
- **Action:** Compare the two backends’ `.env` files and ensure `MONGO_URI` is identical if you want one shared database.

---

## 2. API URL (where the frontends send requests)

| Client | Where it's set | Default / typical value |
|--------|----------------|-------------------------|
| **Web frontend** (admin + client) | `process.env.REACT_APP_API_URL \|\| 'http://localhost:5000'` | **http://localhost:5000** (your `.env` has `REACT_APP_API_BASE_URL`, but the code uses `REACT_APP_API_URL`, so the fallback is used unless you set `REACT_APP_API_URL`) |
| **Mobile app** (Flutter) | `Config.dynamicApiBaseUrl` → `lib/config.dart` | **Android (production):** `https://nomu-backend.onrender.com/api` **Local / dev:** `http://localhost:5000/api` (or from `.env` / override) |

**Conclusion – API URL:**  
- **Web** and **mobile** do **not** point at the same backend by default in production:  
  - Web uses `http://localhost:5000` (or whatever you set for `REACT_APP_API_URL`).  
  - Mobile uses `https://nomu-backend.onrender.com/api` on Android.  
- So in production, the web admin and the mobile app are usually talking to **different servers** (web backend vs mobile backend), unless you explicitly point the web to the mobile backend URL.

---

## 3. Backend servers (two different codebases)

| Backend | Port (default) | Promo routes (summary) |
|---------|----------------|------------------------|
| **Web backend** (`01-web-application/backend/index.js`) | `process.env.PORT \|\| 5000` | `GET /api/promos` (admin list), `GET /api/promos/active` (public), `POST /api/promos`, `PUT /api/promos/:id`, `DELETE /api/promos/:id`, etc. |
| **Mobile backend** (`02-mobile-client/mobile-backend/server.js`) | `process.env.PORT \|\| 5000` | `GET /api/promos` (public active list `{ success, promos }`), `POST /api/admin/promos`, `PUT /api/admin/promos/:id`, `DELETE /api/admin/promos/:id`, etc. |

So even if both run on port 5000, they are **two different applications** with different route shapes and response formats. Only one of them can run on a given port at a time.

---

## 4. Summary – “Same” or “not the same”

| Item | Same for web and mobile? | Notes |
|------|---------------------------|--------|
| **Database** | Can be the same | Only if both backends use the same `MONGO_URI` in their `.env` (e.g. both pointing at **nomucafephdb**). Your web backend already uses that; confirm mobile backend `.env` matches. |
| **API URL** | No (by default) | Web → `localhost:5000` or its own deployed URL; mobile → `nomu-backend.onrender.com`. So they hit different backends unless you set the web’s `REACT_APP_API_URL` to the mobile backend URL. |
| **Backend code** | No | Web backend and mobile backend are different codebases and different APIs. |

---

## 5. What you need for “everything in promo management on web to reflect on mobile”

1. **Same database**  
   Set the **mobile backend** `MONGO_URI` to the same value as the **web backend** (e.g. the `nomucafephdb` Atlas URI). Then both backends read/write the same promo data.

2. **Same API for both** (so admin and mobile see the same data and behavior):  
   Either:
   - Use **one** backend for both (e.g. only run the mobile backend and point the web frontend to it by setting `REACT_APP_API_URL` to that backend’s URL), or  
   - Use **only** the web backend and point the mobile app at it (change mobile `Config` / `.env` to the web backend URL and ensure the web backend exposes the routes and response shape the mobile app expects).

With the current setup (two backends, different default API URLs), web admin and mobile will only stay in sync if they either share the same database and you run only one of the two backends and point both frontends to it, or you add custom sync between the two backends.

---

## 6. Quick checks you can do

1. **Database:**  
   In `02-mobile-client/mobile-backend`, open `.env` and compare `MONGO_URI` with `01-web-application/backend/.env`. If they are identical (e.g. both `...nomucafephdb...`), then the database is the same.

2. **Web API URL:**  
   In the web frontend, ensure `REACT_APP_API_URL` is set in `.env` (or in the build env) to the backend you intend (e.g. `https://nomu-backend.onrender.com` if you want the web to use the mobile backend). Note: the code uses `REACT_APP_API_URL`, not `REACT_APP_API_BASE_URL`.

3. **Mobile API URL:**  
   In the mobile app, `Config.dynamicApiBaseUrl` (and thus `apiBaseUrl`) is resolved in `lib/config.dart`; on Android it defaults to `nomu-backend.onrender.com`. That is the backend the mobile app is using.

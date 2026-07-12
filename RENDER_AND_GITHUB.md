# Render + GitHub deployment map (Nomu / pjeremiah)

This matches the three services in your **NomuCafe** Render workspace and the monorepo on GitHub.

## Render services → GitHub folders

| Render service | Public URL | Repo path | Role |
|----------------|------------|-----------|------|
| **NomuCafe** | https://nomucafe.onrender.com | `01-web-application/frontend` | React admin + public site (static) |
| **nomu-backend** | https://nomu-backend.onrender.com | `01-web-application/backend` | Web API: admin sign-in, menu, promos, analytics |
| **nomu-mobile-backend** | https://nomu-mobile-backend.onrender.com | `02-mobile-client/mobile-backend` | Mobile + barista API: loyalty, OTP login, inventory |

**Not on Render (local / APK build only):**

| Folder | Role |
|--------|------|
| `03-mobile-barista/mobile-barista-frontend` | Barista Flutter app — talks to **nomu-mobile-backend** |
| `03-mobile-barista/mobile-barista-backend` | Optional local scanner API (port 5002); production uses **nomu-mobile-backend** |

## What each client must call

| App | API base URL |
|-----|----------------|
| Admin / web (NomuCafe site) | `https://nomu-backend.onrender.com` |
| Customer mobile (`02-mobile-client`) | `https://nomu-mobile-backend.onrender.com/api` |
| Barista app (`03-mobile-barista`) | `https://nomu-mobile-backend.onrender.com/api` |

Configured in repo:

- Web: `01-web-application/frontend/.env` → `REACT_APP_API_URL=https://nomu-backend.onrender.com`
- Barista: `03-mobile-barista/mobile-barista-frontend/.env` → `SERVER_HOST=nomu-mobile-backend.onrender.com`

## Render environment checklist

### nomu-backend

- `ALLOWED_ORIGINS` must include your live site origin:
  ```
  https://nomu.cafe,https://www.nomu.cafe,https://nomucafe.onrender.com
  ```
- Secrets (set in Render dashboard, not only in git): `MONGO_URI`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `SESSION_SECRET`, `RECAPTCHA_SECRET_KEY`

### NomuCafe (static site)

- Build env at deploy time:
  ```
  REACT_APP_API_URL=https://nomu-backend.onrender.com
  ```
- After changing this, **redeploy NomuCafe** so the React bundle is rebuilt.

### nomu-mobile-backend

- Same MongoDB as web if you want shared data: `MONGO_URI` → `nomucafephdb` Atlas URI
- `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS` (same as web if users/admins are shared)
- `WEB_BACKEND_URL=https://nomu-backend.onrender.com` (abuse alerts / cross-service calls)
- **Abuse block (required for barista supervisor unlock):**
  ```
  ENABLE_SUSPICIOUS_PATTERN_DETECTION=true
  ABUSE_DETECTION_THRESHOLD_SAME_CUSTOMER=8
  ABUSE_DETECTION_THRESHOLD_RAPID_SCANS=10
  CUSTOMER_MAX_SCANS_PER_DAY=12
  CUSTOMER_MAX_POINTS_PER_DAY=12
  ```
- See [04-documentation/ABUSE-BLOCK-SUPERVISOR-UNLOCK.md](./04-documentation/ABUSE-BLOCK-SUPERVISOR-UNLOCK.md)

## Mobile APK releases (hosted on NomuCafe static site)

| App | Version | Download path | Cache bust |
|-----|---------|---------------|------------|
| Customer | v1.0.14+15 | `/Nomu-Mobile-Application.apk` | `?v=1016` |
| Barista | v1.0.23+24 | `/Nomu-Barista-Application.apk` | `?v=1024` |

APK files: `01-web-application/frontend/public/`. After rebuilding APKs, bump version in `pubspec.yaml`, update `?v=` in `NomuApp.jsx`, `AdminLayout.jsx`, and `download-apk.html`, commit, push — NomuCafe redeploy serves new files.

## GitHub → Render flow

1. Push to **main** on GitHub (`pjeremiah/Nomu` or your fork).
2. Render auto-deploys services linked to the repo (Blueprint from `render.yaml` if connected).
3. Confirm all three services show **Deployed** (as in your dashboard).

## Common login issues

| Symptom | Cause | Fix |
|---------|--------|-----|
| **Failed to fetch** on `localhost:3000` | CORS: Render API does not allow `http://localhost:3000` | Sign in at **https://nomucafe.onrender.com** or add localhost to `ALLOWED_ORIGINS` on nomu-backend |
| **Failed to fetch** on nomucafe.onrender.com | Wrong `REACT_APP_API_URL` in NomuCafe build | Set env on NomuCafe service and redeploy |
| Barista app cannot log in | App pointed at nomu-backend instead of nomu-mobile-backend | Rebuild APK after pulling; host = `nomu-mobile-backend.onrender.com` |
| Abuse block modal missing credential fields | Old barista APK | Download barista APK `?v=1024` (v1.0.23+24) |
| Abuse never triggers | `ENABLE_SUSPICIOUS_PATTERN_DETECTION` not `true` on nomu-mobile-backend | Set on Render, redeploy |
| Supervisor unlock fails | Wrong role (staff) or wrong password | Use manager/owner web admin credentials |

## Health checks

```text
https://nomu-backend.onrender.com/api/health
https://nomu-mobile-backend.onrender.com/api/health
```

Both should return JSON with `"status":"OK"`.

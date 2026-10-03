# Plan: Altegio Nail Master Dashboard (React + FastAPI on Vercel)

## Context
A nail master at Luxio uses Altegio and wants a mobile dashboard that shows:
- how much she earned (AMD) on a given day
- her bookings for that day
- her full booking history for any date range

The app is a React frontend with a FastAPI backend, deployed as one Vercel project. It copies the setup of the user's existing repo `harutyunyan88/portfolio`:
- `npm run dev` runs Vite and uvicorn together via `concurrently`.
- Vite proxies `/api` to `:8000` during local development.
- On Vercel, `api/index.py` re-exports `backend.main:app`, and `vercel.json` rewrites `/api/(.*)` to it.

The backend is needed because it keeps the Altegio tokens secret and avoids browser CORS limits.

**Decisions already made**
- "Earned" = the sum of booking prices for now. A commission % is planned for later; there is an optional hook for it.
- Totals include every booking except cancelled ones and no-shows.
- The app is protected by one app password. All Altegio tokens live in Vercel environment variables.
- Visual style: minimalist, dark, in shades of purple.

## Project structure (working dir: `C:\Users\Perdator\Desktop\Altegio Admin`)
```
api/index.py                 # Vercel entry (same as portfolio): sys.path + `from backend.main import app`
backend/
  __init__.py
  config.py                  # pydantic-settings Settings + cached get_settings() (portfolio pattern)
  main.py                    # FastAPI app, routers under /api
  auth.py                    # login + HMAC-signed token, `require_auth` dependency
  altegio.py                 # httpx client: fetch records w/ pagination, map to domain
  schemas.py                 # Pydantic response models
  tests/test_bookings.py     # pytest with httpx MockTransport (no real API calls)
scripts/python.mjs           # copy of portfolio's venv-python launcher
scripts/check_altegio.py     # Phase 0 connectivity/permission probe
src/
  main.tsx, App.tsx          # react-router: /login, / (Dashboard), /history
  api/client.ts              # fetch wrapper, adds Bearer token, 401 → /login
  pages/Login.tsx
  pages/Dashboard.tsx
  pages/History.tsx
  components/                # TotalCard, BookingRow, DayPicker, DateRangeFilter, BottomNav
  lib/format.ts              # AMD formatting (`12 500 ֏`), Yerevan date helpers
  index.css                  # Tailwind v4 + purple theme tokens
index.html, vite.config.ts (proxy /api → 127.0.0.1:8000), package.json, tsconfig*.json
vercel.json, requirements.txt, requirements-dev.txt, .python-version, .node-version
.env.example, .gitignore, .vercelignore
public/manifest.webmanifest + icons  # PWA "Add to Home Screen"
```

## Backend

**Environment variables** (`.env` for local use, Vercel env vars in production; `.env.example` is committed):
`ALTEGIO_PARTNER_TOKEN`, `ALTEGIO_USER_TOKEN`, `ALTEGIO_COMPANY_ID`, `ALTEGIO_STAFF_ID`, `APP_PASSWORD`, `AUTH_SECRET`, `TIMEZONE=Asia/Yerevan`, optional `COMMISSION_PERCENT`.

**Endpoints**
- `POST /api/auth/login` with body `{password}`. If the password matches `APP_PASSWORD` (checked with `hmac.compare_digest`), it returns `{token}`: a stateless HMAC-SHA256 signed payload that expires after 30 days. No database is needed.
- `GET /api/bookings?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD` (requires auth). It returns:
  ```
  { date_from, date_to, total_amd, count, commission_amd|null,
    bookings: [{ id, datetime, client_name, services:[{name, price}], price, status }] }
  ```
  - The Dashboard calls it with `date_from == date_to`.
  - The History page calls it with the selected range, capped at 1 year.
- `GET /api/health`

**Altegio integration (`backend/altegio.py`)**
- Request: `GET https://api.alteg.io/api/v1/records/{company_id}?staff_id=&start_date=&end_date=&page=&count=200`.
- Headers: `Authorization: Bearer {partner}, User {user}` and `Accept: application/vnd.api.v2+json`.
- It loops through pages until a page comes back short.
- Mapping:
  - price = sum of each service's `cost_to_pay`, falling back to `cost`
  - service name = `title`
  - client = `client.name`, or "—" if missing
  - status comes from `attendance`: 1 = came, 2 = confirmed, 0 = pending, -1 = no-show. A `deleted` booking counts as cancelled.
  - Cancelled and no-show bookings are excluded from the list and the totals.
  - Results are sorted by time.
- Errors: an Altegio 401 or 403 becomes a 502 with a clear message, such as "token lacks permission".
- `commission_amd = total_amd * COMMISSION_PERCENT/100` when that variable is set, otherwise null. This is the hook for the commission feature later.
- "Today" is calculated in Asia/Yerevan time, never in server UTC.

**Dependencies:** `requirements.txt` lists fastapi, pydantic-settings and httpx. `requirements-dev.txt` adds uvicorn and pytest.

## Frontend
Stack: React 19, TypeScript, Vite, Tailwind v4 and react-router, matching the portfolio repo. Mobile-first layout with a maximum width of about 480px, centered on desktop.

- **Theme:** deep purple background (`#140c26`), card surfaces (`#221640` / `#2d1d55`), violet accents (`#7c3aed`, `#a78bfa`) and light lavender text (`#ece6ff`). Cards have rounded corners and soft gradients, and the total uses a large tabular-number style. Defined as CSS tokens in `index.css`.
- **Login (`/login`):** a single password field. The token is stored in `localStorage` inside a try/catch. Unauthenticated users are redirected here.
- **Dashboard (`/`):**
  - Day switcher at the top: ‹ prev, date (tap opens a native `<input type="date">`), next ›, plus a "Today" chip. The default is today.
  - A total card with "Earned" in AMD and the booking count.
  - A list of bookings, one row each: client, service name(s), price and time. A small status dot marks completed vs upcoming.
  - Empty, loading and error states.
- **History (`/history`):**
  - A From/To date filter, defaulting to the 1st of the current month through today.
  - Quick chips: This month, Last month, This week.
  - A summary card for the range (total AMD and number of bookings).
  - Bookings grouped by day, each day headed with its date and subtotal, using the same row component as the Dashboard.
- **Bottom navigation:** Dashboard and History tabs.
- **PWA:** manifest, theme color and icons so she can install it on her phone. A service worker is not needed.

## Getting the tokens and IDs
You only have to do step 1 by hand. The script handles everything else.

1. **`ALTEGIO_PARTNER_TOKEN`** (you do this once, about 5 minutes)
   - Sign in at app.alteg.io (any account works, including hers).
   - Go to Marketplace → Developer account and register. The direct link is `https://app.alteg.io/appstore/developers/1`.
   - Open Account settings → Account details. The Partner Token is shown there automatically.
   - If anything is unclear, Altegio's API support is api@alteg.io.
2. **`ALTEGIO_USER_TOKEN`**, obtained by `scripts/check_altegio.py`
   - Run `npm run altegio:setup`. It asks for the partner token (or reads it from `.env`), then her Altegio login and password, using `getpass` so the password isn't shown.
   - It calls `POST https://api.alteg.io/api/v1/auth` with `{login, password}` and reads `data.user_token`.
   - The password is never saved or sent to me. Only the resulting token is written to `.env`.
3. **`ALTEGIO_COMPANY_ID`**, found by the same script
   - It calls the companies list (`GET /companies?my=1`, or `GET /locations` in the newer docs) and prints each id and name.
   - If there's only Luxio, it picks it automatically. Otherwise it asks which one.
   - Manual fallback: the number in the Altegio web app URL, e.g. `app.alteg.io/timetable/<company_id>`.
4. **`ALTEGIO_STAFF_ID`**, found by the same script
   - It lists the staff (`GET /company/{id}/staff`, or `/locations/{id}/team_members`) and matches her by name, or asks which one is her.
5. The script then fetches one day of her records and prints a sample. This confirms her staff account is allowed to read its own records and shows the real field names, so the mapping can be adjusted if needed.
   - If access is denied (403), the Luxio admin has to grant her role permission to view her own records.
6. `APP_PASSWORD` is chosen by you. `AUTH_SECRET` is generated randomly by the script.
7. All values are written to `.env` (which is gitignored). Later they're copied into Vercel → Project → Settings → Environment Variables.

The script tries both the classic paths (`/records`, `/companies`) and the newer documented aliases (`/locations/.../appointments`). The backend then uses whichever path worked.

## Build order
0. **First action:** copy this plan into the project as `PLAN.md` in `C:\Users\Perdator\Desktop\Altegio Admin`.
1. **Token setup, before any UI work:** write `scripts/check_altegio.py` plus the `altegio:setup` npm script and the venv. You get the partner token and run the script with her (see the section above). This confirms her account can read her records and that the fields match the mapping.
2. Scaffold the config files: package.json scripts (copied from the portfolio repo), vite proxy, vercel.json, python.mjs, venv.
3. Backend: config, Altegio client and mapping, auth, endpoints, and pytest tests using mocked Altegio responses.
4. Frontend: theme, router, Login, Dashboard, History.
5. Deploy to Vercel: set the environment variables and test on her phone.

## Verification
- Run `npm run test:api`. The pytest tests cover mapping, pagination, cancelled/no-show filtering, totals, the Yerevan "today" boundary, and auth (401 without a token, 401 with a bad password).
- Run `npm run dev` and open `localhost:5173` in the browser pane at mobile size (375px). Then:
  - log in
  - check that today's total matches the sum of its rows
  - switch to yesterday
  - on History, check that the default range is the current month, change the range, and check that the daily subtotals add up to the range total
- Compare a few days by hand against what she sees in the Altegio app.
- After deploying to Vercel, check that `/api/health` responds, that deep links such as `/history` load correctly through the SPA rewrite, and that logging in works.

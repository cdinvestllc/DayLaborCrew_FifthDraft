# DayLaborCrew - PRD & Implementation Log

## Problem Statement
Full-stack upgrade of DayLaborCrew (communitylandscapeatlanta/DayLaborCrew_FourthDraft) on branch `admin-dashboard-upgrade`.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor), Python 3.11
- **Frontend**: React 19, Tailwind CSS, Craco, MapLibre GL JS
- **Auth**: JWT-based custom auth
- **Payments**: Stripe (Emergent integration) + PayPal (graceful fallback)
- **PWA**: manifest.json + Service Worker v2 + Push Notifications (VAPID)

---

## Session 1 – Bugs + New Features (March 25, 2026)

### Bug Fixes
- **PayPal SDK error**: Added `PAYPAL_VALID` check — shows friendly "PayPal Unavailable" UI if client ID starts with `re_` or `sk_`
- **Coupon validation**: Confirmed working — updates `couponResult.final_price` in state
- **Public profile API**: Route `/api/users/public/{user_id}` confirmed working
- **Admin Messages Archived**: Full archive/unarchive/delete flow. Toggle switches Active ↔ Archived
- **data-testid**: Changed `view-crew-profile-{id}` → `view-profile-crew-{id}` on ContractorDashboard sidebar

### PWA
- `public/manifest.json`: Full PWA manifest (icons, theme, display mode)
- `public/sw.js` v2: cache-first static + network-first API + background sync + Push Notification handler
- `public/index.html`: theme-color, apple-mobile meta, manifest link, SW registration
- `PWAInstallPrompt.jsx`: beforeinstallprompt banner with Install/Later

### App Settings (`/settings/app`)
- Sound Alerts + Test Sound (Web Audio API)
- Vibration Alerts (mobile only check)
- Browser Notifications + Push Notifications (VAPID subscribe)
- Alert Types per role (jobCompleted, jobAccepted, jobDeclined)
- Analytics Privacy toggle
- Persisted to `/api/users/preferences`

### Verified Contractors Feature
- **New page**: `/verified-contractors` (public, no auth)
- State + Trade filters; List and Map views
- MapLibre GL + OpenStreetMap tiles; GeoJSON cluster source (cluster:true, radius 50)
- Sidebar with full contractor profile + portfolio
- Landing page buttons: "Find Verified Contractors" + "Our App"
- **Admin**: fee/header/tagline CMS, toggle verified per contractor
- **Backend**: public + admin endpoints; `is_verified_contractor` field

### "Our App" Page (`/our-app`)
- Hero + JobStack link + PWA install guide + 4 feature cards

---

## Session 2 – P1/P2 Backlog (March 25, 2026)

### Stripe Verified Contractor Checkout
- `POST /api/payments/verified-contractor/create-session` — creates Stripe session for configured fee
- `GET /api/payments/verified-contractor/status/{session_id}` — polls + grants `is_verified_contractor: true`
- `GET /api/payments/verified-contractor/fee` — public fee endpoint
- ContractorDashboard: gradient "Get Verified — $39.99" CTA banner; polling on return from Stripe; shows green verified badge when paid
- Idempotent: duplicate paid sessions not processed twice

### Admin Coupon Test UI
- New "Test a Coupon" panel alongside Create Coupon in Admin → Coupons tab
- Enter any code + plan → previews original price, discounted price, uses remaining
- "Test" shortcut button on each coupon row

### Push Notification Delivery (VAPID)
- `utils/push_utils.py`: pywebpush sender with expired subscription cleanup
- Hooked into `job_accepted` and `job_completed` job events
- VAPID keys stored in backend `.env`; frontend subscribes via `/api/users/push/subscribe`

### MapLibre Marker Clustering
- GeoJSON cluster source: `cluster:true, clusterMaxZoom:10, clusterRadius:50`
- Circle layer for clusters + count label layer + unclustered points layer
- Click cluster → zoom in; click point → open sidebar

### Service Worker v2
- Improved stale-while-revalidate for static assets
- Background Sync tag `sync-jobs` for offline job data refresh
- Push notification click opens correct route

---

## Test Results
- **Iteration 1**: 95% (minor MapLibre style init — fixed)
- **Iteration 2**: 100% (all P1/P2 features passing)

---

## Credentials
- Admin: admin@thedaylaborers.com / Admin@123
- Super Admin: superadmin@thedaylaborers.com / SuperAdmin@123
- Test Contractors: contractor1-3@test.com / Test@1234
- Test Coupon: `TEST20` (20% off all plans)

---

## Prioritized Backlog

### P0 (Done)
All bug fixes, PWA, app settings, verified contractors, our app, verified checkout, coupon test UI, push notifications, map clustering

### P1 (Next)
- Email notification when contractor gets verified (confirmation email)
- Crew dashboard push notification subscription flow

### P2 (Future)
- Verified Contractor renewal/expiry option (admin-toggleable)
- MapLibre satellite/terrain tile toggle
- Analytics dashboard for verified contractor page views

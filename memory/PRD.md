# DayLaborCrew - PRD & Implementation Log

## Problem Statement
Full-stack upgrade of DayLaborCrew (communitylandscapeatlanta/DayLaborCrew_FourthDraft) on branch `admin-dashboard-upgrade`.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor), Python 3.11
- **Frontend**: React 19, Tailwind CSS, Craco, MapLibre GL JS
- **Auth**: JWT-based custom auth
- **Payments**: Stripe (Emergent integration) + PayPal (graceful fallback)
- **PWA**: manifest.json + Service Worker + Push Notifications (VAPID)

## Core Requirements (Static)
1. Bug fixes (PayPal, coupons, public profile, admin messages)
2. PWA installation + offline caching
3. App Settings (sound/vibration/notifications toggles)
4. Verified Contractors feature (new page + MapLibre + admin)
5. "Our App" page

## What's Been Implemented (March 2026)

### Bug Fixes
- **PayPal SDK error**: Added `PAYPAL_VALID` check — shows friendly "PayPal Unavailable" UI if client ID starts with `re_` or `sk_`; includes "Switch to Card Payment" button
- **Coupon validation**: Already correctly updates `couponResult.final_price` in state; verified working
- **Public profile API**: Route `/api/users/public/{user_id}` correctly maps UUID `id` field; confirmed working
- **Admin Messages Archived**: Full archive/unarchive/delete flow added. Toggle button switches between Active and Archived threads
- **data-testid**: Changed `view-crew-profile-{id}` → `view-profile-crew-{id}` on ContractorDashboard sidebar

### PWA
- `public/manifest.json`: Full PWA manifest with icons, theme color, display mode
- `public/sw.js`: Service Worker with cache-first static + network-first API strategy; Push Notification handler
- `public/index.html`: Added theme-color, apple-mobile-web-app-capable, manifest link, SW registration
- `PWAInstallPrompt.jsx`: Component that shows "Add to Home Screen" banner using `beforeinstallprompt` event

### App Settings (`/settings/app`)
- Sound Alerts toggle + Test Sound button (Web Audio API)
- Vibration Alerts toggle (mobile only)
- Browser Notifications toggle (requests Notification API permission)
- Push Notifications toggle (subscribes to VAPID push via Service Worker)
- Alert Types: jobCompleted, jobAccepted, jobDeclined (role-specific)
- Usage Analytics toggle
- Preferences persisted to backend (`/api/users/preferences`)

### Verified Contractors Feature
- **New page**: `/verified-contractors` (public, no auth required)
- **Header/Tagline**: CMS-editable via admin
- **State + Trade filters**
- **List view**: Grid of contractor cards with Verified badge, rating, location
- **Map view**: MapLibre GL JS with OpenStreetMap tiles; markers with business name bubbles
- **Sidebar**: Click contractor to see full profile + portfolio
- **Admin controls**: Settings tab → Verified Contractors section (fee, header, tagline, toggle verified status per contractor)
- **Backend**: `GET /api/public/verified-contractors`, `GET /api/admin/verified-contractors`, `PUT /api/admin/verified-contractors/{id}`, `GET/PUT /api/admin/settings/verified-contractor-fee`

### "Our App" Page (`/our-app`)
- Marketing page with JobStack link
- PWA install instructions
- 4 feature highlights
- Reference to PeopleReady JobStack

### Navigation Updates
- Landing page: Added "Find Verified Contractors" + "Our App" buttons below main CTAs
- Navbar: Added "App Settings" link in user dropdown

### Backend Additions
- `admin_routes.py`: archive/unarchive/delete message endpoints, verified contractors admin endpoints, push subscription endpoint
- `public_routes.py`: verified contractors public endpoint + settings
- `user_routes.py`: preferences GET/PUT + push subscribe
- Server startup: initializes verified contractor fee defaults in settings

## Test Results (Iteration 1)
- 95% pass rate (10/11 features fully passing)
- Minor: MapLibre map style initialization (FIXED — set raster style directly in constructor)

## Credentials
- Admin: admin@thedaylaborers.com / Admin@123
- Super Admin: superadmin@thedaylaborers.com / SuperAdmin@123
- Test Contractors: contractor1-3@test.com / Test@1234

## Prioritized Backlog
### P0 (Done)
- All bug fixes, PWA, app settings, verified contractors, our app page

### P1 (Next)
- Add "Verified Contractor Fee" payment flow (Stripe checkout for contractors to pay $39.99)
- Add coupon creation UI for testing coupons
- Production VAPID push delivery

### P2 (Future)
- Real-time offline sync for job listings
- MapLibre clustering for many contractors
- Contractor analytics dashboard

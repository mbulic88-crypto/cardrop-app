---
name: iOS checkout flow
description: App Store Guideline 3.1.1 compliance — token-based Safari redirect for Stripe payments.
---

**Flow:**
1. User selects a plan in-app. iOS detected via `detectIos()`.
2. `window.open('', '_blank')` called SYNCHRONOUSLY (before any await) to avoid Safari popup blocker.
3. `POST /api/ios-checkout/token` called with `{ type, plan, spotId? }`.
   - Validates plan against ALLOWED_PLANS whitelist (map_hack: premium/day_pass/godisnji_premium; spot: gold/silver).
   - Stores token in DB with 5-min TTL; returns `checkoutUrl`.
4. `newWin.location.href = checkoutUrl` opens the server HTML page.
5. `GET /ios-checkout?token=...` renders plan cards (does NOT mark token used).
   - Escapes all user-controlled HTML via `he()` function; JS values use `JSON.stringify()`.
   - Pre-selects plan from `token.plan`. "Pay" button calls `/api/ios-checkout/create-session`.
6. `POST /api/ios-checkout/create-session` validates token + enforces `plan === token.plan`,
   marks token used, creates Stripe Checkout session, returns `{ url }`.
7. Page redirects to Stripe URL.

**Why:** Apple Guideline 3.1.1 forbids in-app payment UI for digital goods on iOS.
Token single-use + plan whitelist prevent replay/substitution attacks.
XSS prevention: `subtitle` (contains spot.title) HTML-escaped; JS vars use JSON.stringify.

**Key files:**
- `server/routes.ts`: GET /ios-checkout, POST /api/ios-checkout/token, POST /api/ios-checkout/create-session
- `client/src/lib/detectIos.ts`: iOS detection
- `shared/schema.ts`: iosCheckoutTokens table (has plan column)

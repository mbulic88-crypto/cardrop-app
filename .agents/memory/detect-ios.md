---
name: detectIos utility
description: Shared client-side iOS/iPadOS detection helper; handles iPadOS 13+ desktop UA.
---

Located at `client/src/lib/detectIos.ts`. Detects:
- `/iPhone|iPod/` in UA (standard)
- `/iPad/` in UA (older iPadOS)
- `/Macintosh/` in UA + `navigator.maxTouchPoints > 1` (iPadOS 13+ desktop mode)

**Why:** iPadOS 13+ reports `navigator.platform === 'MacIntel'` in desktop mode, so
simple regex on UA misses it. Apple App Review uses an iPad Air in desktop mode.

**How to apply:** Import `detectIos` from `@/lib/detectIos` in any client page that
needs to branch on iOS (e.g., to hide Stripe UI and use Safari redirect flow instead).
All 3 pages (landing.tsx, map-hack-ns.tsx, add-spot.tsx) use this helper via useEffect.

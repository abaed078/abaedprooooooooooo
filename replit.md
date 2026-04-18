# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Autel MaxiSYS MS Ultra S2 — Web App

Full web recreation of the Autel MaxiSYS MS Ultra S2 professional automotive diagnostic scanner. ~98% feature parity.

### Routes (34+ pages)

**Diagnostics Group:**
- `/` Dashboard, `/vehicles`, `/diagnostics`, `/live-scan`, `/system-map`
- `/oscilloscope` (4-channel + reference waveform), `/guided-diag`, `/predictive`, `/full-scan`, `/battery`
- `/monitors` (OBD Readiness), `/topology` (Topology Map 3.0), `/active-tests` (Bidirectional)
- `/inspection` (MaxiVideo camera + AI Defect Detection), `/ai-chat`

**Service Group:**
- `/maintenance` (51 service resets), `/programming` (ECU coding), `/adas`
- `/wiring` (wiring diagrams + pin-out), `/key-programming` (IMMO wizard 6 procedures)
- `/tpms` (tire pressure + Tire Tread Analyzer), `/ev-diagnostics` (EV battery/motor/charging)
- `/remote-expert`, `/injector-coding` (IMA/QR Code wizard)

**Data Group:**
- `/vin-decoder` (NHTSA API + recalls), `/dtc-lookup` (141 DTC codes + Freeze Frame)
- `/maxifix` (community repair database), `/dvi` (Digital Vehicle Inspection 42 points)
- `/pre-post-scan` (Pre/Post repair comparison), `/parts` (Parts catalog OEM+Aftermarket)
- `/compare`, `/reports`, `/stats`, `/emissions`, `/customer`, `/updates`

### Key Features
- Arabic/English bilingual with RTL support
- Real OBD-II connectivity (ELM327 via Bluetooth/USB)
- Claude-powered AI Assistant + "Hey Max" wake word voice activation
- High-performance AI diagnostics: SSE streaming, repeated-answer cache, compact conversation context, browser-side throttled rendering, stop-response control, and a local expert diagnostic engine for core DTCs when the external AI service is unavailable
- PWA manifest + service worker
- Voice commands (22 commands), keyboard shortcuts, QR codes, Excel export
- Dark/light theme toggle
- AI Defect Detection in inspection camera (scratch, dent, crack, paint)
- Pre/Post repair scan comparison with improvement score
- Tire Tread Analyzer with legal minimum indicators
- Parts catalog (18 parts, OEM + Aftermarket)

### Critical Routing Note — Replit Proxy + Vite Base Path

The Replit proxy **strips the `/autel-maxisys` prefix** before forwarding to Vite. This means:
- `import.meta.env.BASE_URL` is always `"/"` (not `/autel-maxisys/`)
- BUT the browser still sees the full path `/autel-maxisys/...`
- Using `BASE_URL` directly as the Wouter router base causes ALL routes to show 404

**Fix (in `App.tsx`):** Detect the router base at runtime from the manifest link in `index.html`:
```typescript
const ROUTER_BASE = (() => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const href = link?.getAttribute("href") || "";
  if (href && href.endsWith("/manifest.json")) {
    return href.slice(0, -"/manifest.json".length); // "/autel-maxisys"
  }
  return import.meta.env.BASE_URL.replace(/\/$/, "");
})();
```
The `index.html` has `<link rel="manifest" href="/autel-maxisys/manifest.json" />` hardcoded,
which provides the correct base path for wouter even when `BASE_URL = "/"`.

### API Calls from Frontend
- Direct API calls use `ROUTER_BASE + "/api/..."` for the stats endpoint
- `@workspace/api-client-react` hooks use configured base URL from OpenAPI setup

## Pre-Launch QA Results (April 2026)

### TypeScript — CLEAN ✓
All TypeScript errors resolved (0 errors across 50+ files):
- Drizzle ORM `.values()` / `.set()` calls cast via `$inferInsert` pattern
- Missing React hook imports added (`useMemo`, `useCallback`) in stats, guided-diag, diagnostics
- `useParams<{id:string}>()` generic fix in diagnostics/detail
- Form mutate type mismatches resolved with `Parameters<typeof fn.mutate>[0]`
- `vite-env.d.ts` created for `import.meta.env` types
- `lib/api-zod` duplicate type export fixed with explicit re-exports
- AbortError import fixed in Anthropic integration utils
- `artifacts/autel-maxisys`, `artifacts/mockup-sandbox`, `lib/api-spec`, `lib/db` excluded from root tsconfig

### Security Scan Results
| Scanner | Status |
|---------|--------|
| Dependency Audit | 4 critical, 22 high, 15 moderate |
| SAST | 5 high, 5 medium, 2 low |
| HoundDog | Clean |

**Key findings:**
- `jspdf@2.5.2` — 2 critical, multiple high (fix: upgrade to v4.x — breaking change, deferred)
- `drizzle-orm@0.36.4` — 2 high (fix: 0.45.2 — significant API changes, deferred)
- `xlsx@0.18.5` — 4 high (no fix available from vendor)
- `firebase-applet-config.json` — keys flagged by SAST, but Firebase client keys are public by design
- Vite 6.4.2 — already patched (CVE-2025-30208 not applicable)
- SAST dynamic method calls in full-scan page — low-risk internal constants, not user input

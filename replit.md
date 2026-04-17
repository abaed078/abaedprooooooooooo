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

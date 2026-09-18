# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A POC ("EatWhat") that accepts a food photo and uses OpenAI's Vision API to return a
structured nutritional analysis. One Express/TypeScript backend at the repo root, with
two independent POC frontends against the same API: a static web page (`public/`) and a
native Expo/React Native app (`mobile/`).

## Commands

### Backend (repo root)

```bash
npm run dev     # nodemon + ts-node, watches app.ts and src/ (see nodemon.json)
npm run build   # tsc -> dist/
npm start        # node dist/app.js (run build first)
```

There is no test suite configured (`npm test` is a stub that exits 1).

Requires `.env` with `OPENAI_API_KEY` and optionally `PORT` (default 3000) — copy from
`.env.example`. Server serves the web frontend from `public/` as static files, and API
docs (Swagger UI, generated from the Zod schemas) at `/api-docs`.

### Mobile (`mobile/`)

```bash
cd mobile
npm install
npm start         # expo start
npm run ios       # expo start --ios
npm run android   # expo start --android
```

Requires the backend running separately (`npm run dev` from repo root) — the mobile app
has no backend of its own. Before running, set `API_BASE_URL` in
[mobile/src/config.ts](mobile/src/config.ts) to whatever actually reaches the backend
from wherever the app runs (see Networking gotcha below) — this doesn't auto-detect and
has to be edited by hand when your LAN IP changes.

Mobile has its own doc chain: [mobile/CLAUDE.md](mobile/CLAUDE.md) points to
[mobile/AGENTS.md](mobile/AGENTS.md), which is a reminder that Expo SDK versions move
fast — check the versioned docs at docs.expo.dev before writing Expo/RN code rather than
assuming an older API surface still applies.

## Architecture

### Zod schemas are the single source of truth

Every data shape is defined once as a Zod schema and reused three ways: runtime
validation (`.parse()`/`.safeParse()`), static TypeScript types (`z.infer<typeof X>`),
and OpenAPI documentation (`registry.register(...)` / `registry.registerPath(...)`).
This is why routes in [src/api/food.controller.ts](src/api/food.controller.ts) look
more verbose than a bare Express handler — each one pairs a `registry.registerPath()`
call (pure metadata, feeds [src/swagger.ts](src/swagger.ts) to build `/api-docs`) with
the actual `router.*()` handler. When adding or changing an endpoint, keep both in sync.

Schema layering:
- [src/ai/schemas.ts](src/ai/schemas.ts) — `MealAnalysisSchema` (what the OpenAI call
  must produce: dish name, `components[]`, `nutrition` as **ranges** (`{low, high}`) for
  calories/protein/carbs/fat/fibre/sodium, confidence, uncertainties, interpretation,
  disclaimer), `MealComponentSchema`, `RangeSchema`, `ConfidenceSchema`.
- [src/models/nutrition.ts](src/models/nutrition.ts) — extends `MealAnalysisSchema` with
  storage fields (`id`, `imageUrl`, `analyzedAt`) to form `NutritionRecordSchema`, plus
  `NutritionSummarySchema` for the aggregate endpoint.
- [src/openapi-registry.ts](src/openapi-registry.ts) — the shared `OpenAPIRegistry`
  instance every schema registers into, plus the common `ErrorSchema`.

Nutrition values are ranges, not point estimates, throughout — reflected in the prompt,
the schema, and `nutritionService.getSummary()`'s range-aware aggregation.

### Request flow and validation boundaries

`POST /api/food/analyze` → [src/api/food.controller.ts](src/api/food.controller.ts) →
[src/services/food-analyzer.ts](src/services/food-analyzer.ts) (calls OpenAI, then
regex-extracts the `{...}` JSON block from the completion text, `JSON.parse`s it, and
runs it through `MealAnalysisSchema.parse()` — never trusts the raw LLM output to match
the schema just because the prompt asked for it) →
[src/services/nutrition-service.ts](src/services/nutrition-service.ts) stores the record.

Validation happens at the two actual boundaries only: client request bodies (e.g. the
`PATCH /records/:id/components` handler `safeParse`s its body) and the OpenAI response.
Internal service-to-service calls are not re-validated — the type system is trusted once
data is inside the process.

### Storage is a plain in-memory Map

[src/services/nutrition-service.ts](src/services/nutrition-service.ts) has no database —
`NutritionService` wraps a `Map<string, NutritionRecord>`. State resets on every restart,
including `nodemon` auto-restarts during development. The class is written so that
nothing outside this file knows storage is in-memory, making it the swap point for real
persistence later.

### Middleware mounting in app.ts

[app.ts](app.ts) mounts `upload.single("image")` (multer) in front of the *entire*
`/api/food` router, not just the multipart upload route:

```ts
app.use("/api/food", upload.single("image"), foodRoutes);
```

This works because multer checks `Content-Type` and calls `next()` without acting when
the request isn't `multipart/form-data` — so the JSON-body `PATCH .../components` route
and the bodyless `GET`/`DELETE` routes share the mount safely. New JSON routes under
`/api/food` don't need this changed, but don't assume broadly-mounted middleware in this
codebase is content-type-agnostic elsewhere without checking.

### AI prompt/schema coupling

[src/ai/prompts.ts](src/ai/prompts.ts)'s `NUTRITION_ANALYSIS_PROMPT` and
[src/ai/schemas.ts](src/ai/schemas.ts)'s `MealAnalysisSchema` describe the same JSON
shape independently (the prompt is a string, not generated from the schema) — if you
change one, update the other by hand or parsing will fail at the
`MealAnalysisSchema.parse()` step in `food-analyzer.ts`. The model call itself is in
[src/ai/openai-client.ts](src/ai/openai-client.ts).

### Two frontends, one API contract

Both [public/](public/) (plain HTML/CSS/JS, served statically by `app.ts`, no build
step) and [mobile/](mobile/) (Expo/React Native) POST the selected image to
`POST /api/food/analyze` and render the same response shape — no login, history, or
database on either side. `mobile/src/types.ts` mirrors the backend's `MealAnalysis`
shape by hand (not generated), so a schema change in `src/ai/schemas.ts` needs a matching
manual edit there too.

### Component quantity: unit vs. grams edit mode

Each detected meal component carries two independent, both-nullable portion
representations on `MealComponentSchema` ([src/ai/schemas.ts](src/ai/schemas.ts)):
`quantity`/`unit` (human-readable, e.g. `2` + `"pieces"`) and
`estimated_grams_low`/`estimated_grams_high`. Both frontends' component editors
([mobile/src/components/ComponentEditor.tsx](mobile/src/components/ComponentEditor.tsx),
`renderComponents()`/`buildAddRow()` in [public/app.js](public/app.js)) show only one of
these two field-pairs at a time per row, picked by a **local, frontend-only "mode"**
(`"unit" | "grams"`) that is never sent to the backend — the PATCH payload always
includes whatever values both pairs currently hold, mode or no mode.

- Default mode per AI-detected component: `"unit"` if it has a natural human-readable
  quantity (`quantity != null && unit`), else `"grams"` (e.g. a sauce/garnish, which the
  AI already leaves quantity/unit `null` on). Manually-added components default to
  `"unit"`. See `defaultModeFor()` in `app.js` / `usesUnitMode()` +
  `defaultModeFor()` in `mobile/src/format.ts` + `ComponentEditor.tsx`.
- A dropdown/select per row lets the user switch modes at any time. Switching only
  changes which inputs are shown — it never clears the other pair's stored value, so
  toggling back and forth is lossless.
- **React Native has no native `<select>`/dropdown.** `ComponentEditor.tsx`'s
  `ModeDropdown` is this codebase's reference pattern for a small (2–3 option) chooser on
  mobile: a pressable trigger showing the current value, toggling a small
  `position: "absolute"` options list anchored under it via local open/close state — no
  extra npm dependency (e.g. a picker library) added for it. Reuse this pattern rather
  than reaching for a new dependency the next time mobile needs a similar chooser. The
  web side just uses a native `<select>`.

### Mobile networking gotchas (see [LEARNINGS.md](LEARNINGS.md) for full detail)

- `localhost` in Expo Go on a physical phone means the phone itself, not the dev
  machine — `mobile/src/config.ts`'s `API_BASE_URL` must be the Mac's LAN IP for a
  physical device, `http://10.0.2.2:3000` for the Android emulator, or
  `http://localhost:3000` for the iOS simulator.
- Expo SDK 57 makes its own WinterCG-spec `fetch` (`expo/fetch`) the global `fetch`,
  which requires a real `Blob`/`File` in `FormData` — the classic RN
  `formData.append("image", { uri, name, type })` object throws at runtime (typechecks
  fine, fails at runtime). [mobile/src/api.ts](mobile/src/api.ts) uses
  `expo-file-system`'s `File` class instead, which implements `Blob`.
- The Expo dev server (Metro, port 8081) and the Express backend (port 3000) are two
  independent processes; if the app loads but API calls fail (or vice versa), check
  which of the two is actually unreachable rather than assuming both are down together.

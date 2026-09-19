# CLAUDE.md

EatWhat: food photo → OpenAI Vision API → nutrition breakdown. Express/TS backend at
repo root; `public/` (static HTML/JS) and `mobile/` (Expo/RN) are two independent
frontends against the same API.

## Commands

Backend (repo root):
- `npm run dev` — nodemon + ts-node
- `npm run build` — tsc → `dist/`
- `npm start` — run built `dist/app.js`
- No test suite (`npm test` is a stub that exits 1)
- Copy `.env.example` → `.env`; requires `OPENAI_API_KEY`, optional `PORT` (default 3000)

Mobile (`mobile/`):
- `npm install`, then `npm start` / `npm run ios` / `npm run android`
- **Gotcha:** mobile has no backend of its own — start `npm run dev` at repo root first
- **Gotcha:** set `API_BASE_URL` in `mobile/src/config.ts` by hand (see Mobile networking below); it does not auto-detect
- Check `mobile/AGENTS.md` before writing Expo/RN code — SDK 57 moved fast, old patterns can silently misbehave

## Backend architecture

- Flow: `POST /api/food/analyze` → `food.controller.ts` → `food-analyzer.ts` (OpenAI call, regex-extract the `{...}` block, `JSON.parse`, Zod-validate) → `nutrition-service.ts` stores the record.
- Storage is a plain in-memory `Map` in `nutrition-service.ts` — no DB.
- **Gotcha:** state resets on every restart, including `nodemon` auto-restarts in dev.
- The model only estimates nutrition per-component. Dish-level `nutrition` totals are always derived in code via `computeDishNutrition()` (`src/services/nutrition-math.ts`), summing components low-to-low/high-to-high — un-rounded float sums produce artifacts like `57.30000004`.
- **Display precision is one rule, applied everywhere:** `calories_kcal` is a whole number, every other nutrient is exactly 2dp — `roundNutrientRanges()` in `nutrition-math.ts` is the single place this rule lives. It's applied to a component's `nutrition` the moment it's produced (right after the initial `/analyze` parse, and inside every recalculation path — deterministic scaling and AI fallback alike) and again to any summed total (`computeDishNutrition`, `nutrition-service.ts#getSummary()`) — so components and totals always agree, and a value never looks different depending on which code path produced it. Every write path that touches `components` (initial analysis, bulk edit, single-component edit) recomputes totals through `computeDishNutrition`, so `nutrition` can't go stale relative to `components`.
- Editing a component's `name`/`quantity`/`unit` (`PATCH /records/:id/components/:index`) always produces a fresh nutrition estimate — `nutrition`/`confidence` are never client-writable (`UpdateComponentFieldsSchema` omits them). `FoodAnalyzerService#resolveComponentUpdate` decides how:
  - **Deterministic (no AI call):** same `unit` label, only `quantity` changed → scale by the quantity ratio (`scaleByQuantity`). Grams range changed, `quantity`/`unit` unchanged → scale by the grams-midpoint ratio (`scaleByGrams`). Both live in `nutrition-math.ts`, apply the same factor to every nutrient's low/high, and carry the previous `confidence` forward unchanged.
  - **AI fallback (text-only, no image re-sent):** anything else — `name` changed, `unit` label changed without a matching grams edit, both portion representations changed at once, or there's no baseline (`null` previous quantity/grams) to scale from. `FoodAnalyzerService#reestimateComponent`, prompt in `buildComponentRecalculationPrompt`, previous portion + nutrition given as an anchor.
- **Gotcha:** there are two different `PATCH .../components...` endpoints — don't confuse them:
  - `PATCH /records/:id/components` (bulk, whole array) — used for add/remove. Resums totals; also scans for the add-form's all-zero nutrition sentinel (`isZeroNutrition`) and gives any such entry a real AI estimate (`FoodAnalyzerService#estimateNewComponent`, same prompt builder with no previous anchor) before storing — so this endpoint *can* make AI calls too, just only for genuinely new components.
  - `PATCH /records/:id/components/:index` (single component) — used for editing name/quantity/unit. May or may not call the AI (see above), so callers should always show a loading state rather than assuming it's a cheap write.

Validation & routing:
- Validate only at real boundaries: the OpenAI response, the `PATCH /records/:id/components` body (`UpdateComponentsBodySchema`), and the `PATCH /records/:id/components/:index` body (`UpdateComponentFieldsSchema`) — all in `food.controller.ts`. No other internal call is re-validated.
- Responses go through `src/api/respond.ts`'s `sendOk`/`sendMessage`/`sendError` — use these, not raw `res.json`.
- **Gotcha:** `upload.single("image")` (multer) is mounted in front of the whole `/api/food` router in `app.ts`, not just `/analyze`:
  ```ts
  app.use("/api/food", upload.single("image"), foodRoutes);
  ```
  Safe only because multer no-ops on non-multipart requests — don't assume other broadly-mounted middleware here is as content-type-agnostic without checking.
- **Gotcha:** `src/ai/prompts.ts`'s prompt and `MealAnalysisSchema` (`src/ai/schemas.ts`) describe the same JSON shape by hand — update both, or `MealAnalysisSchema.parse()` fails in `food-analyzer.ts`.
- No OpenAPI/Swagger layer — removed deliberately (see `LEARNINGS.md`); don't re-add it without a real docs consumer.

## Frontends

- Both POST to `/api/food/analyze` and render the same response shape; nutrition values are ranges (`{low, high}`) throughout, never point estimates.
- **Gotcha:** `mobile/src/types.ts` mirrors the backend's Zod-inferred types by hand — a schema change in `src/ai/schemas.ts` needs a matching manual edit there.

### Component quantity: unit vs. grams mode

- Each component has two independent, nullable portion fields: `quantity`/`unit` and `estimated_grams_low`/`estimated_grams_high`.
- Which pair is shown is a **local, frontend-only mode** (`"unit" | "grams"`), never sent to the backend — both PATCH endpoints always include both pairs' current values regardless of mode.
- Default mode: `"unit"` if the component has quantity+unit, else `"grams"` (`usesUnitMode()`/`defaultModeFor()` in `mobile/src/format.ts`; `defaultModeFor()` in `public/app.js`).
- Switching modes never clears the other pair's stored value.
- **Gotcha:** React Native has no native `<select>` — reuse `mobile/src/components/ModeDropdown.tsx`'s pattern (pressable trigger + absolutely-positioned options list) rather than adding a picker dependency.
- **Gotcha:** `ModeDropdown`'s options list needs its own raised `zIndex` when open (e.g. above the `nutrientGrid` rendered below it) — RN doesn't stack an absolutely-positioned view above later siblings by paint order alone.
- The mobile component detail screen (`mobile/src/screens/ComponentDetailScreen.tsx`) edits name/quantity/unit as local draft state and only calls `PATCH .../components/:index` on an explicit "Save changes" tap — not per keystroke/blur — since that call is a real AI round trip, not a cheap write.

### Mobile networking (see `LEARNINGS.md` for detail)

- **Gotcha:** `localhost` in Expo Go on a physical phone is the phone itself, not the dev machine — use the Mac's LAN IP; `http://10.0.2.2:3000` for the Android emulator; `http://localhost:3000` for the iOS simulator.
- **Gotcha:** Expo SDK 57's global `fetch` requires a real `Blob`/`File` in `FormData` — the classic RN `{ uri, name, type }` object typechecks but throws at runtime. `mobile/src/api.ts` uses `expo-file-system`'s `File` instead.
- Metro (port 8081) and Express (port 3000) are independent processes — if the app loads but API calls fail (or vice versa), check which one is actually unreachable.

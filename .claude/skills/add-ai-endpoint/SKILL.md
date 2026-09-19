---
name: add-ai-endpoint
description: Checklist for adding or changing a backend endpoint in EatWhat (food-nutrition-analyzer) that calls OpenAI or reshapes nutrition data — the schema/prompt/service/controller/docs/mobile-mirror steps that are easy to do out of order or forget one of.
---

# Adding or changing an AI-touching endpoint

This codebase's OpenAI integration keeps showing up in the same shape of change: a schema, a prompt, a service method, a controller route, and two places that silently go stale if skipped. Work through these in order.

## 1. Schema first (`src/ai/schemas.ts`)

- Define/extend the Zod schema for whatever the client can send and whatever the AI must return — validated only at real boundaries (the OpenAI response, and client request bodies), nothing else re-validated internally.
- If a field must never be client-writable (e.g. `nutrition`, `confidence`), express that at the type level — `.omit({...})` a schema rather than trusting handler code to strip it.
- Export both the schema and its inferred `z.infer<>` type.

## 2. Prompt (`src/ai/prompts.ts`)

- The prompt text and the schema describe the same JSON shape by hand — a mismatch means `.parse()` throws deep inside a service, not a clean 400. Update both together.
- Keep range-estimation conventions consistent with the existing prompts: low/high as a *likely* interval (not min/max), the `calories ≈ 4·protein + 4·carbs + 9·fat` consistency check, and the same confidence-level definitions ("low"/"medium"/"high") — don't invent new conventions per endpoint.
- Reuse existing prompt-building patterns (e.g. an optional anchor section included only when there's a previous value to scale from) rather than writing a divergent one-off.

## 3. Service (`src/services/`)

- One pattern for turning an OpenAI text response into validated data: regex-extract the `{...}` block → `JSON.parse` → Zod `.parse`. Every AI call in this codebase already follows it — reuse it, don't reinvent it.
- If the endpoint returns nutrition numbers, run them through `roundNutrientRanges()` (`nutrition-math.ts`) before returning — this is the *only* place display precision (calories: whole number, every other nutrient: 2dp) is applied, and it's easy to add a new numeric AI output that skips it and looks inconsistent with everything else.
- If the endpoint changes `components`, dish-level totals must be recomputed via `computeDishNutrition()` — every existing write path does this so `nutrition` can never go stale relative to `components`; a new write path shouldn't be the exception.
- Prefer a deterministic, code-only path over an AI call wherever the data already on hand makes the answer computable (see `scaleByQuantity`/`scaleByGrams` in `nutrition-math.ts` for the pattern) — cheaper, faster, and removes a failure mode. Only fall back to AI when the edit doesn't cleanly match a case you can compute.

## 4. Controller (`src/api/food.controller.ts`)

- Validate the request body with the schema from step 1 via `.safeParse`, `400` on failure.
- Responses go through `sendOk`/`sendMessage`/`sendError` (`respond.ts`) — never raw `res.json`.
- Wrap any AI-calling path in try/catch → `500` with the error message; a slow or failing OpenAI call shouldn't crash the process or hang without a response.

## 5. Docs (`CLAUDE.md`)

- If the change affects timing (a previously-instant endpoint can now call the AI), behavior (a documented gotcha becomes fixed, or a new one appears), or the request/response contract, update the relevant bullet. A stale gotcha actively misdirects the next session — worse than no gotcha at all.

## 6. Mobile mirror (`mobile/src/`)

- `mobile/src/types.ts` mirrors `src/ai/schemas.ts`'s inferred types by hand — a schema change needs a matching manual edit there, or the mobile app silently drifts from what the backend actually sends/expects.
- If the endpoint is called from `mobile/src/api.ts`, keep its error-handling shape identical to the existing calls (check `response.ok`/`body.success`, throw `body.error`) rather than a bespoke variant.
- Check `mobile/AGENTS.md` if the change also touches Expo/RN-specific frontend patterns — SDK 57 moved fast enough that old patterns can silently misbehave.

## 7. Verify

- `npm run build` (backend `tsc`) and, if mobile types changed, `cd mobile && npx tsc --noEmit`. This codebase has no test suite, so a clean typecheck on both is the actual correctness gate before calling a change done.

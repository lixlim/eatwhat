import { z } from "zod";

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);

export const RangeSchema = z.object({
  low: z.number(),
  high: z.number(),
});

// Shared by the top-level `nutrition` totals and each component's own
// nutrition breakdown — same six nutrients, same range shape, in both
// places (see NUTRIENT_KEYS / food-analyzer.ts, which sums the latter into
// the former).
export const NutrientRangesSchema = z.object({
  calories_kcal: RangeSchema,
  protein_g: RangeSchema,
  carbs_g: RangeSchema,
  fat_g: RangeSchema,
  fibre_g: RangeSchema,
  sodium_mg: RangeSchema,
});

export const NUTRIENT_KEYS = [
  "calories_kcal",
  "protein_g",
  "carbs_g",
  "fat_g",
  "fibre_g",
  "sodium_mg",
] as const;

export const MealComponentSchema = z.object({
  name: z.string(),
  // Human-friendly portion, e.g. quantity=2, unit="pieces" -> "2 pieces".
  // unit is free text (not a fixed list) chosen by the model, already
  // inflected for quantity and including any size descriptor, e.g.
  // "large bowl". Grams remain the source of truth for nutrition math.
  quantity: z.number().nullable(),
  unit: z.string().max(40).nullable(),
  estimated_grams_low: z.number().nullable(),
  estimated_grams_high: z.number().nullable(),
  // Per-component nutrition contribution. Required (not nullable): the
  // top-level `nutrition` totals are computed by summing these across
  // components (see RawMealAnalysisSchema / food-analyzer.ts), so every
  // component must carry real figures for the totals to be accurate.
  nutrition: NutrientRangesSchema,
  confidence: ConfidenceSchema,
});

export const MealAnalysisSchema = z.object({
  dish_name: z.string(),
  dish_name_local: z.string().nullable(),

  components: z.array(MealComponentSchema),

  nutrition: NutrientRangesSchema,

  overall_confidence: ConfidenceSchema,

  uncertainties: z.array(z.string()),

  interpretation: z.string(),

  disclaimer: z.string(),
});

// The client-editable subset of a component — name, quantity/unit, and the
// grams range. `nutrition`/`confidence` are deliberately omitted: they're
// always AI-derived (see reestimateComponent in food-analyzer.ts), never
// something a client can submit directly.
export const UpdateComponentFieldsSchema = MealComponentSchema.omit({
  nutrition: true,
  confidence: true,
});

// What the single-component recalculation call is expected to return: a
// fresh nutrition estimate for the new portion, plus how confident that
// estimate is — the same two fields RawMealAnalysisSchema's components
// carry, just for one component in isolation.
export const ComponentNutritionEstimateSchema = z.object({
  nutrition: NutrientRangesSchema,
  confidence: ConfidenceSchema,
});

// The shape the OpenAI response itself is validated against. It omits the
// top-level `nutrition` entirely because the model is not asked for totals —
// the prompt only has it estimate nutrition per component, and
// food-analyzer.ts derives every total by summing those before validating
// against the full MealAnalysisSchema (which still requires `nutrition` for
// everything downstream: storage, the API response, both frontends).
export const RawMealAnalysisSchema = MealAnalysisSchema.omit({ nutrition: true });

export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Range = z.infer<typeof RangeSchema>;
export type NutrientRanges = z.infer<typeof NutrientRangesSchema>;
export type NutrientKey = (typeof NUTRIENT_KEYS)[number];
export type MealComponent = z.infer<typeof MealComponentSchema>;
export type MealAnalysis = z.infer<typeof MealAnalysisSchema>;
export type UpdateComponentFields = z.infer<typeof UpdateComponentFieldsSchema>;
export type ComponentNutritionEstimate = z.infer<typeof ComponentNutritionEstimateSchema>;

import { z } from "zod";

const ConfidenceSchema = z.enum(["low", "medium", "high"]);

const RangeSchema = z.object({
  low: z.number(),
  high: z.number(),
});

const MealComponentSchema = z.object({
  name: z.string(),
  estimated_grams_low: z.number().nullable(),
  estimated_grams_high: z.number().nullable(),
  confidence: ConfidenceSchema,
});

export const MealAnalysisSchema = z.object({
  dish_name: z.string(),
  dish_name_local: z.string().nullable(),

  components: z.array(MealComponentSchema),

  nutrition: z.object({
    calories_kcal: RangeSchema,
    protein_g: RangeSchema,
    carbs_g: RangeSchema,
    fat_g: RangeSchema,
    fibre_g: RangeSchema,
    sodium_mg: RangeSchema,
  }),

  overall_confidence: ConfidenceSchema,

  uncertainties: z.array(z.string()),

  interpretation: z.string(),

  disclaimer: z.string(),
});

export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Range = z.infer<typeof RangeSchema>;
export type MealComponent = z.infer<typeof MealComponentSchema>;
export type MealAnalysis = z.infer<typeof MealAnalysisSchema>;

import { z } from "zod";
import { registry } from "../openapi-registry";

export const ConfidenceSchema = registry.register(
  "Confidence",
  z.enum(["low", "medium", "high"])
);

export const RangeSchema = registry.register(
  "Range",
  z.object({
    low: z.number(),
    high: z.number(),
  })
);

export const MealComponentSchema = registry.register(
  "MealComponent",
  z.object({
    name: z.string(),
    estimated_grams_low: z.number().nullable(),
    estimated_grams_high: z.number().nullable(),
    confidence: ConfidenceSchema,
  })
);

export const MealAnalysisSchema = registry.register(
  "MealAnalysis",
  z.object({
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
  })
);

export type Confidence = z.infer<typeof ConfidenceSchema>;
export type Range = z.infer<typeof RangeSchema>;
export type MealComponent = z.infer<typeof MealComponentSchema>;
export type MealAnalysis = z.infer<typeof MealAnalysisSchema>;

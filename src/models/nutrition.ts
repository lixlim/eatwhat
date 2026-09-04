import { z } from "zod";
import { registry } from "../openapi-registry";
import { ConfidenceSchema, MealAnalysisSchema, RangeSchema } from "../ai/schemas";

export const NutritionRecordSchema = registry.register(
  "NutritionRecord",
  MealAnalysisSchema.extend({
    id: z.string().uuid(),
    imageUrl: z.string().optional(),
    analyzedAt: z.date().openapi({ format: "date-time" }),
  })
);

export const NutritionSummarySchema = registry.register(
  "NutritionSummary",
  z.object({
    totalCalories: RangeSchema,
    totalProtein: RangeSchema,
    totalCarbs: RangeSchema,
    totalFat: RangeSchema,
    totalFibre: RangeSchema,
    totalSodium: RangeSchema,
    itemCount: z.number(),
    avgConfidence: ConfidenceSchema,
  })
);

export type NutritionRecord = z.infer<typeof NutritionRecordSchema>;
export type NutritionSummary = z.infer<typeof NutritionSummarySchema>;

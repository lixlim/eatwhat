import { z } from "zod";
import { ConfidenceSchema, MealAnalysisSchema, RangeSchema } from "../ai/schemas";

export const NutritionRecordSchema = MealAnalysisSchema.extend({
  id: z.string().uuid(),
  imageUrl: z.string().optional(),
  analyzedAt: z.date(),
});

export const NutritionSummarySchema = z.object({
  totalCalories: RangeSchema,
  totalProtein: RangeSchema,
  totalCarbs: RangeSchema,
  totalFat: RangeSchema,
  totalFibre: RangeSchema,
  totalSodium: RangeSchema,
  itemCount: z.number(),
  avgConfidence: ConfidenceSchema,
});

export type NutritionRecord = z.infer<typeof NutritionRecordSchema>;
export type NutritionSummary = z.infer<typeof NutritionSummarySchema>;

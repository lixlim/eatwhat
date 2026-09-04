import { MealAnalysis, Range } from "../ai/schemas";

export interface NutritionRecord extends MealAnalysis {
  id: string;
  imageUrl?: string;
  analyzedAt: Date;
}

export interface NutritionSummary {
  totalCalories: Range;
  totalProtein: Range;
  totalCarbs: Range;
  totalFat: Range;
  totalFibre: Range;
  totalSodium: Range;
  itemCount: number;
  avgConfidence: "high" | "medium" | "low";
}

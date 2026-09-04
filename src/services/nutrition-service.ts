import { NutritionRecord, NutritionSummary } from "../models/nutrition";
import { MealAnalysis, Range } from "../ai/schemas";
import { v4 as uuidv4 } from "uuid";

export class NutritionService {
  private records: Map<string, NutritionRecord> = new Map();

  addRecord(nutritionData: MealAnalysis, imageUrl?: string): NutritionRecord {
    const record: NutritionRecord = {
      id: uuidv4(),
      ...nutritionData,
      imageUrl,
      analyzedAt: new Date(),
    };

    this.records.set(record.id, record);
    return record;
  }

  getRecord(id: string): NutritionRecord | undefined {
    return this.records.get(id);
  }

  getAllRecords(): NutritionRecord[] {
    return Array.from(this.records.values());
  }

  getSummary(): NutritionSummary {
    const records = Array.from(this.records.values());
    const emptyRange: Range = { low: 0, high: 0 };

    if (records.length === 0) {
      return {
        totalCalories: emptyRange,
        totalProtein: emptyRange,
        totalCarbs: emptyRange,
        totalFat: emptyRange,
        totalFibre: emptyRange,
        totalSodium: emptyRange,
        itemCount: 0,
        avgConfidence: "medium",
      };
    }

    const addRange = (a: Range, b: Range): Range => ({
      low: a.low + b.low,
      high: a.high + b.high,
    });

    const totals = records.reduce(
      (acc, record) => ({
        calories: addRange(acc.calories, record.nutrition.calories_kcal),
        protein: addRange(acc.protein, record.nutrition.protein_g),
        carbs: addRange(acc.carbs, record.nutrition.carbs_g),
        fat: addRange(acc.fat, record.nutrition.fat_g),
        fibre: addRange(acc.fibre, record.nutrition.fibre_g),
        sodium: addRange(acc.sodium, record.nutrition.sodium_mg),
      }),
      {
        calories: emptyRange,
        protein: emptyRange,
        carbs: emptyRange,
        fat: emptyRange,
        fibre: emptyRange,
        sodium: emptyRange,
      }
    );

    const confidenceMap = { high: 3, medium: 2, low: 1 };
    const avgConfidenceScore =
      records.reduce((sum, r) => sum + confidenceMap[r.overall_confidence], 0) /
      records.length;

    let avgConfidence: "high" | "medium" | "low" = "medium";
    if (avgConfidenceScore >= 2.5) avgConfidence = "high";
    else if (avgConfidenceScore < 1.5) avgConfidence = "low";

    const round = (range: Range): Range => ({
      low: Math.round(range.low * 10) / 10,
      high: Math.round(range.high * 10) / 10,
    });

    return {
      totalCalories: round(totals.calories),
      totalProtein: round(totals.protein),
      totalCarbs: round(totals.carbs),
      totalFat: round(totals.fat),
      totalFibre: round(totals.fibre),
      totalSodium: round(totals.sodium),
      itemCount: records.length,
      avgConfidence,
    };
  }

  deleteRecord(id: string): boolean {
    return this.records.delete(id);
  }

  clearAll(): void {
    this.records.clear();
  }
}

export const nutritionService = new NutritionService();

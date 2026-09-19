import { NutritionRecord, NutritionSummary } from "../models/nutrition";
import { MealAnalysis, MealComponent, Range } from "../ai/schemas";
import { v4 as uuidv4 } from "uuid";
import { computeDishNutrition, roundNutrientRanges } from "./nutrition-math";

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

    // Same rounding rule as everywhere else (calories: whole number, other
    // nutrients: 2dp) — routed through roundNutrientRanges (keyed by the
    // schema's nutrient keys) rather than a separate local round(), so this
    // summary can't drift from the same rule components/dish totals use.
    const rounded = roundNutrientRanges({
      calories_kcal: totals.calories,
      protein_g: totals.protein,
      carbs_g: totals.carbs,
      fat_g: totals.fat,
      fibre_g: totals.fibre,
      sodium_mg: totals.sodium,
    });

    return {
      totalCalories: rounded.calories_kcal,
      totalProtein: rounded.protein_g,
      totalCarbs: rounded.carbs_g,
      totalFat: rounded.fat_g,
      totalFibre: rounded.fibre_g,
      totalSodium: rounded.sodium_mg,
      itemCount: records.length,
      avgConfidence,
    };
  }

  updateComponents(id: string, components: MealComponent[]): NutritionRecord | undefined {
    const record = this.records.get(id);
    if (!record) return undefined;

    const updated: NutritionRecord = {
      ...record,
      components,
      nutrition: computeDishNutrition(components),
    };
    this.records.set(id, updated);
    return updated;
  }

  // Replaces a single component (after its nutrition has been re-estimated —
  // see FoodAnalyzerService#reestimateComponent) and resums dish totals from
  // the resulting array, same as updateComponents.
  updateComponentAt(id: string, index: number, component: MealComponent): NutritionRecord | undefined {
    const record = this.records.get(id);
    if (!record || index < 0 || index >= record.components.length) return undefined;

    const components = record.components.map((c, i) => (i === index ? component : c));
    const updated: NutritionRecord = {
      ...record,
      components,
      nutrition: computeDishNutrition(components),
    };
    this.records.set(id, updated);
    return updated;
  }

  deleteRecord(id: string): boolean {
    return this.records.delete(id);
  }

  clearAll(): void {
    this.records.clear();
  }
}

export const nutritionService = new NutritionService();

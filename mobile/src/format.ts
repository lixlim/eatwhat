import { MealComponent, NutrientRanges, Range } from "./types";

export function formatRange(range: Range | undefined, unit: string): string {
  if (!range) return `– ${unit}`;
  return `${range.low}–${range.high} ${unit}`;
}

export function usesUnitMode(component: Pick<MealComponent, "quantity" | "unit">): boolean {
  return component.quantity != null && !!component.unit;
}

type PortionFields = Pick<
  MealComponent,
  "quantity" | "unit" | "estimated_grams_low" | "estimated_grams_high"
>;

// Compact "2 pieces" / "80-120 g" summary for a component's current
// portion, used wherever the full editor isn't shown (e.g. the summary row).
export function formatPortion(component: PortionFields): string {
  if (usesUnitMode(component)) {
    return `${component.quantity} ${component.unit}`;
  }
  if (component.estimated_grams_low != null && component.estimated_grams_high != null) {
    return `${component.estimated_grams_low}–${component.estimated_grams_high} g`;
  }
  return "–";
}

export interface NutrientField {
  key: keyof NutrientRanges;
  label: string;
  shortLabel: string;
  unit: string;
}

// Same six nutrients, same order, used for both the dish-level totals and
// each component's own breakdown.
export const NUTRIENT_FIELDS: NutrientField[] = [
  { key: "calories_kcal", label: "Calories", shortLabel: "Cal", unit: "kcal" },
  { key: "protein_g", label: "Protein", shortLabel: "Protein", unit: "g" },
  { key: "carbs_g", label: "Carbs", shortLabel: "Carbs", unit: "g" },
  { key: "fat_g", label: "Fat", shortLabel: "Fat", unit: "g" },
  { key: "fibre_g", label: "Fibre", shortLabel: "Fibre", unit: "g" },
  { key: "sodium_mg", label: "Sodium", shortLabel: "Sodium", unit: "mg" },
];

export type SaveStatus = "" | "saving" | "saved" | "error";

export function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function capitalize(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

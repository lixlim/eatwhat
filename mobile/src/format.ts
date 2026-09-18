import { MealComponent, NutrientRanges, Range } from "./types";

export function formatRange(range: Range | undefined, unit: string): string {
  if (!range) return `– ${unit}`;
  return `${range.low}–${range.high} ${unit}`;
}

export function usesUnitMode(component: Pick<MealComponent, "quantity" | "unit">): boolean {
  return component.quantity != null && !!component.unit;
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

export function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function capitalize(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

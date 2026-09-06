import { MealComponent, Range } from "./types";

export function formatRange(range: Range | undefined, unit: string): string {
  if (!range) return `– ${unit}`;
  return `${range.low}–${range.high} ${unit}`;
}

export function formatPortion(component: MealComponent): string {
  const { estimated_grams_low: low, estimated_grams_high: high } = component;
  if (low == null && high == null) return "Amount unclear";
  if (low != null && high != null) return `${low}–${high}g`;
  return `~${low != null ? low : high}g`;
}

export function capitalize(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

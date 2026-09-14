import { Range } from "./types";

export function formatRange(range: Range | undefined, unit: string): string {
  if (!range) return `– ${unit}`;
  return `${range.low}–${range.high} ${unit}`;
}

export function parseGrams(value: string): number | null {
  if (value.trim() === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function capitalize(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

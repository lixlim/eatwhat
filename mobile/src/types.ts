export type Confidence = "low" | "medium" | "high";

export interface Range {
  low: number;
  high: number;
}

export interface NutrientRanges {
  calories_kcal: Range;
  protein_g: Range;
  carbs_g: Range;
  fat_g: Range;
  fibre_g: Range;
  sodium_mg: Range;
}

export interface MealComponent {
  name: string;
  // Human-friendly portion, e.g. quantity=2, unit="pieces" -> "2 pieces".
  // unit is free text chosen by the model (not a fixed list), already
  // inflected for quantity and including any size descriptor, e.g.
  // "large bowl". Grams remain the source of truth for nutrition math.
  quantity: number | null;
  unit: string | null;
  estimated_grams_low: number | null;
  estimated_grams_high: number | null;
  // Never null: the dish-level `nutrition` totals (below) are the sum of
  // these across every component, computed by the backend, not estimated
  // independently.
  nutrition: NutrientRanges;
  confidence: Confidence;
}

export interface MealAnalysis {
  id: string;
  dish_name: string;
  dish_name_local: string | null;
  components: MealComponent[];
  nutrition: NutrientRanges;
  overall_confidence: Confidence;
  uncertainties: string[];
  interpretation: string;
  disclaimer: string;
}

export interface SelectedImage {
  uri: string;
}

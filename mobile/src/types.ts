export type Confidence = "low" | "medium" | "high";

export interface Range {
  low: number;
  high: number;
}

export interface MealComponent {
  name: string;
  estimated_grams_low: number | null;
  estimated_grams_high: number | null;
  confidence: Confidence;
}

export interface MealAnalysis {
  dish_name: string;
  dish_name_local: string | null;
  components: MealComponent[];
  nutrition: {
    calories_kcal: Range;
    protein_g: Range;
    carbs_g: Range;
    fat_g: Range;
    fibre_g: Range;
    sodium_mg: Range;
  };
  overall_confidence: Confidence;
  uncertainties: string[];
  interpretation: string;
  disclaimer: string;
}

export interface SelectedImage {
  uri: string;
}

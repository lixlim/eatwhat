export const NUTRITION_ANALYSIS_PROMPT = `Analyze this food image and provide nutritional information in JSON format.

Return ONLY valid JSON matching this exact shape:
{
  "dish_name": "name of the dish",
  "dish_name_local": "local/native name of the dish, or null if not applicable",
  "components": [
    {
      "name": "component name",
      "estimated_grams_low": number or null,
      "estimated_grams_high": number or null,
      "confidence": "low" | "medium" | "high"
    }
  ],
  "nutrition": {
    "calories_kcal": { "low": number, "high": number },
    "protein_g": { "low": number, "high": number },
    "carbs_g": { "low": number, "high": number },
    "fat_g": { "low": number, "high": number },
    "fibre_g": { "low": number, "high": number },
    "sodium_mg": { "low": number, "high": number }
  },
  "overall_confidence": "low" | "medium" | "high",
  "uncertainties": ["any factors that make this estimate uncertain"],
  "interpretation": "a short explanation of how you interpreted the image",
  "disclaimer": "a brief disclaimer about the accuracy of this estimate"
}`;

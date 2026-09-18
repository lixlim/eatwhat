export const NUTRITION_ANALYSIS_PROMPT = `Analyze this food image and provide nutritional information in JSON format.

For each component, people relate more naturally to counts like "2 pieces" or "1 large
bowl" than to grams — but grams are still needed to calculate nutrition. Provide BOTH:
- a human-friendly quantity using "quantity" + "unit", e.g. quantity=2, unit="pieces"
  for "2 pieces", or quantity=1, unit="large bowl" for "1 large bowl"
- an estimated weight range in grams using "estimated_grams_low"/"estimated_grams_high"

"unit" is free text, not a fixed list — pick whatever noun most naturally describes the
item (common examples, not exhaustive: piece, slice, serving, packet, bowl, plate, cup,
tablespoon, teaspoon, wing, clove, stick, skewer, can, g, ml). Fold any size descriptor
directly into "unit" when it meaningfully describes the portion (e.g. "large bowl",
"small packet") rather than using a separate field. Always give "unit" already inflected
to agree with "quantity" (e.g. "piece" for quantity=1, "pieces" for quantity=2). If no
sensible human-friendly quantity applies (e.g. a sauce or garnish), set "quantity" and
"unit" to null and rely on the grams estimate alone.

For each component, also estimate its own full nutrition breakdown — calories, protein,
carbs, fat, fibre, and sodium — as ranges, under a "nutrition" object shaped exactly like
the dish-level one (see below). Unlike quantity/unit/grams, these are never null: every
component (including sauces, garnishes, and other small items) needs real numbers for
all six, even if some are narrow ranges close to zero. Do NOT estimate dish-level totals
yourself — they are calculated automatically by summing every component's low and high
figures, so make sure each component's ranges reflect its actual share of the dish's
nutrition rather than a rough guess, since the sum is what will be reported as the
dish's totals.

Return ONLY valid JSON matching this exact shape:
{
  "dish_name": "name of the dish",
  "dish_name_local": "local/native name of the dish, or null if not applicable",
  "components": [
    {
      "name": "component name",
      "quantity": number or null,
      "unit": "free-text unit already matching quantity, e.g. piece/pieces, large bowl" or null,
      "estimated_grams_low": number or null,
      "estimated_grams_high": number or null,
      "nutrition": {
        "calories_kcal": { "low": number, "high": number },
        "protein_g": { "low": number, "high": number },
        "carbs_g": { "low": number, "high": number },
        "fat_g": { "low": number, "high": number },
        "fibre_g": { "low": number, "high": number },
        "sodium_mg": { "low": number, "high": number }
      },
      "confidence": "low" | "medium" | "high"
    }
  ],
  "overall_confidence": "low" | "medium" | "high",
  "uncertainties": ["any factors that make this estimate uncertain"],
  "interpretation": "a short explanation of how you interpreted the image",
  "disclaimer": "a brief disclaimer about the accuracy of this estimate"
}`;

import { MealComponent, UpdateComponentFields } from "./schemas";

function describePortion(fields: Pick<MealComponent, "quantity" | "unit" | "estimated_grams_low" | "estimated_grams_high">): string {
  const parts: string[] = [];
  if (fields.quantity != null && fields.unit) {
    parts.push(`${fields.quantity} ${fields.unit}`);
  }
  if (fields.estimated_grams_low != null && fields.estimated_grams_high != null) {
    parts.push(`${fields.estimated_grams_low}-${fields.estimated_grams_high}g`);
  }
  return parts.length > 0 ? parts.join(", ") : "not specified";
}

// Used by the component-edit flow (PATCH /records/:id/components/:index)
// and the "add a component" flow (PATCH /records/:id/components, for any
// entry carrying the all-zero nutrition sentinel — see isZeroNutrition in
// nutrition-math.ts): text-only, single-component estimate, not a fresh
// visual analysis. When `previous` is given, its portion + nutrition are
// included as an anchor so the model scales from a known-good estimate
// rather than guessing from nothing; when it's omitted (a brand-new
// component with no prior estimate), the model estimates from the
// description alone. Deterministic edits (same-unit quantity change, or a
// grams-ratio change) never reach this prompt at all — see
// scaleByQuantity/scaleByGrams in nutrition-math.ts, tried first.
export function buildComponentRecalculationPrompt(
  previous: MealComponent | undefined,
  next: UpdateComponentFields
): string {
  const task = previous
    ? "A single food component's portion has been corrected by the user. Re-estimate\nONLY this component's nutrition for the new portion — do not consider any\nother component of the dish."
    : "A new food component has been added by the user — it wasn't part of the\noriginal photo analysis, so there is no image to look at. Estimate its\nnutrition from the description alone, using standard nutrition knowledge.";

  const anchor = previous
    ? `\nPrevious portion: ${describePortion(previous)}\nPrevious nutrition estimate: ${JSON.stringify(previous.nutrition)}\nPrevious confidence: ${previous.confidence}\n`
    : "";

  const instruction = previous
    ? "Scale the previous estimate to the new portion, adjusting for typical\ncooking/serving variance rather than a purely linear scale-up."
    : "Estimate its nutrition for the given portion.";

  return `
${task}

Food: ${next.name}${anchor}
${previous ? "New portion" : "Portion"}: ${describePortion(next)}

${instruction} Keep the same
range-estimation principles as any nutrition estimate:
- low/high should be a reasonable likely interval for this portion, not
  theoretical min/max bounds
- approximate calorie consistency should hold:
  calories ≈ 4 * protein_g + 4 * carbs_g + 9 * fat_g
- confidence reflects how certain this estimate is ("low" | "medium" | "high")

Return ONLY valid JSON matching this exact shape:

{
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
`;
}

export const NUTRITION_ANALYSIS_PROMPT = `
Analyze the food actually visible in this image and estimate its nutritional content.

Your goal is to estimate the PORTION SHOWN IN THE IMAGE, not a generic restaurant serving
or a typical recipe.

Use visual evidence such as relative portion size, plate/bowl size, food count, thickness,
volume, and proportions between components. Generic serving sizes may be used only as a
secondary reference when the image does not provide enough visual information.

IMPORTANT ESTIMATION PRINCIPLES

1. ESTIMATE THE VISIBLE PORTION
Estimate the quantity and weight of food that appears to be present in this specific image.
Do not automatically assume a standard restaurant serving if the visible portion appears
smaller or larger.

2. USE LIKELY RANGES, NOT EXTREME BOUNDS
All low/high values should represent a reasonable likely interval for the food shown.
They are NOT the minimum and maximum theoretically possible values.

Use the narrowest range that is defensible from the image.
Do not widen ranges simply because some uncertainty exists.

As a general guide:
- high-confidence visible items should usually have relatively narrow ranges
- medium-confidence items may have moderately wider ranges
- low-confidence or inferred items may have wider ranges

Avoid extremely wide ranges unless there is genuine visual ambiguity that could materially
change the amount of food present.

3. AVOID DOUBLE COUNTING
Every calorie and nutrient should belong to exactly one component.

If a prepared component's nutrition already includes its batter, sauce, absorbed oil,
filling, or other preparation ingredients, DO NOT add those ingredients again as separate
components.

If you break a prepared food into separate nutritional components, estimate the base food
without those additions.

Example:
Either:
- "fried chicken wing" whose nutrition includes batter and absorbed frying oil

OR:
- "chicken wing"
- "batter"
- "absorbed frying oil"

Never both.

Likewise, do not estimate a complete prepared dish such as "fried rice" or "char kway teow"
as one nutritionally complete component and then separately add the rice/noodles, oil,
sauce, egg, etc.

4. HIDDEN INGREDIENTS
Do not invent large quantities of invisible oil, butter, sugar, sauces, or condiments.

Account for cooking fat only when it is reasonably implied by the cooking method, and use
a realistic amount of fat absorbed by the portion shown rather than the amount that may
have been used to cook an entire batch.

If an inferred preparation ingredient is already represented in another component's
nutrition, do not add it separately.

5. COMPONENT GRANULARITY
Components should correspond to foods a user could reasonably recognise and correct.

Prefer:
- rice
- roasted pork
- fried egg
- stir-fried vegetables
- curry gravy

Avoid unnecessarily decomposing foods into microscopic recipe ingredients when those
ingredients cannot reasonably be identified from the image.

6. NUTRITION CONSISTENCY
The nutrition estimate for each component must correspond to its estimated gram range,
food type, and preparation method.

Do not independently choose an extreme high value for every nutrient.
Calories, protein, carbohydrate and fat should describe one internally consistent food
estimate.

Approximate calorie consistency should hold:
calories ≈ 4 * protein_g + 4 * carbs_g + 9 * fat_g
allowing reasonable differences for fibre, rounding and food composition.

7. FINAL SANITY CHECK
Before returning the response, mentally consider the sum of all component calorie ranges.

Ask:
- Does this total make sense for the amount of food visibly present?
- Have any ingredients been counted twice?
- Have oil, sauces, or portion weights been overestimated?
- Are the high estimates simultaneously assuming multiple unlikely worst-case conditions?

If the implied total appears implausibly high or low for the visible meal, revise the
component estimates before returning the JSON.

QUANTITY FORMAT

For each component, provide BOTH:
- a human-friendly quantity using "quantity" + "unit"
- an estimated weight range using "estimated_grams_low" and "estimated_grams_high"

People relate more naturally to quantities such as "2 pieces" or "1 bowl" than grams.

"unit" is free text. Pick the noun that most naturally describes the visible item.
Examples include:
piece, slice, serving, packet, bowl, plate, cup, tablespoon, teaspoon, wing,
clove, stick, skewer, can, ladle, scoop, drizzle, handful, g, ml.

Fold meaningful size descriptors into the unit when appropriate, e.g.:
"small bowl", "large piece", "thin slice".

The unit must agree grammatically with quantity:
quantity=1 → "piece"
quantity=2 → "pieces"

If no meaningful human-friendly quantity exists, set quantity and unit to null and rely
on the gram estimate.

COMPONENT NUTRITION

For every component estimate:
- calories
- protein
- carbohydrates
- fat
- fibre
- sodium

Nutrition values must never be null.

The application calculates meal totals automatically by summing component values.
Therefore component estimates must represent only that component's nutritional
contribution and must not overlap with another component.

CONFIDENCE

Use:
- "high": component and portion are clearly visible
- "medium": component is identifiable but portion/preparation has meaningful uncertainty
- "low": identity, portion, or preparation is substantially uncertain

A component being calorie-dense does NOT by itself make confidence low.

UNCERTAINTIES

Only include uncertainties that could materially affect the estimate.
Be specific, for example:
- "Unable to determine whether the chicken was deep-fried or air-fried"
- "Some rice may be hidden underneath the curry"

Avoid generic statements such as "portion sizes may vary".

Return ONLY valid JSON matching this exact shape:

{
  "dish_name": "name of the dish",
  "dish_name_local": "local/native name of the dish, or null if not applicable",
  "components": [
    {
      "name": "component name",
      "quantity": number or null,
      "unit": "free-text human-friendly unit" or null,
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
  "uncertainties": ["specific material uncertainties"],
  "interpretation": "brief explanation of what foods and preparation methods appear to be shown",
  "disclaimer": "Nutrition is an estimate based on the visible food and may differ from the actual meal."
}
`;
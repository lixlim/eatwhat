import {
  ComponentNutritionEstimate,
  MealComponent,
  NutrientKey,
  NutrientRanges,
  NUTRIENT_KEYS,
  UpdateComponentFields,
} from "../ai/schemas";

// The one display-precision rule for nutrition values, applied everywhere a
// NutrientRanges is finalized (initial per-component AI output, dish-level
// sums, deterministic PATCH scaling, and AI-recalculation PATCH results) so
// a value never looks different depending on which code path produced it:
// calories are a whole number, every other nutrient is exactly 2dp.
function roundValue(key: NutrientKey, value: number): number {
  return key === "calories_kcal" ? Math.round(value) : Math.round(value * 100) / 100;
}

export function roundNutrientRanges(nutrition: NutrientRanges): NutrientRanges {
  return NUTRIENT_KEYS.reduce((rounded, key) => {
    rounded[key] = {
      low: roundValue(key, nutrition[key].low),
      high: roundValue(key, nutrition[key].high),
    };
    return rounded;
  }, {} as NutrientRanges);
}

// Dish-level totals are always derived from components, never estimated
// independently — this is the one place that summation happens, shared by
// the initial analysis and every later edit (single-component or bulk), so
// a record's `nutrition` total can never go stale relative to its
// `components` the way PATCH /records/:id/components used to. Components
// are expected to already be rounded (see roundNutrientRanges call sites in
// food-analyzer.ts) — summing rounded values can still drift (e.g.
// 57.30000004), so the sum itself is rounded again here.
export function computeDishNutrition(components: MealComponent[]): NutrientRanges {
  const totals = NUTRIENT_KEYS.reduce((totals, key) => {
    totals[key] = components.reduce(
      (sum, component) => ({
        low: sum.low + component.nutrition[key].low,
        high: sum.high + component.nutrition[key].high,
      }),
      { low: 0, high: 0 }
    );
    return totals;
  }, {} as NutrientRanges);

  return roundNutrientRanges(totals);
}

function scaleRanges(nutrition: NutrientRanges, factor: number): NutrientRanges {
  const scaled = NUTRIENT_KEYS.reduce((scaled, key) => {
    scaled[key] = {
      low: nutrition[key].low * factor,
      high: nutrition[key].high * factor,
    };
    return scaled;
  }, {} as NutrientRanges);

  return roundNutrientRanges(scaled);
}

// Scenario: same unit label, only the quantity changed (this is what the
// mobile quantity stepper produces, since it never touches `unit`) — scale
// nutrition by the quantity ratio instead of asking the AI again. Returns
// null when the edit doesn't cleanly match this shape, signalling the
// caller should try the next strategy.
export function scaleByQuantity(
  previous: MealComponent,
  next: UpdateComponentFields
): ComponentNutritionEstimate | null {
  const gramsUnchanged =
    next.estimated_grams_low === previous.estimated_grams_low &&
    next.estimated_grams_high === previous.estimated_grams_high;

  if (next.name !== previous.name || next.unit !== previous.unit || !gramsUnchanged) {
    return null;
  }
  if (
    next.quantity === previous.quantity ||
    previous.quantity == null ||
    previous.quantity <= 0 ||
    next.quantity == null ||
    next.quantity <= 0
  ) {
    return null;
  }

  const factor = next.quantity / previous.quantity;
  return { nutrition: scaleRanges(previous.nutrition, factor), confidence: previous.confidence };
}

// Scenario: the grams range changed (a mode switch to grams, or a direct
// grams edit) while quantity/unit stayed whatever they were — scale
// nutrition by the grams ratio, anchored on the component's own previous
// grams estimate (grams is the unit-agnostic figure the original AI
// analysis already tied nutrition to). Returns null when the edit doesn't
// cleanly match this shape.
export function scaleByGrams(
  previous: MealComponent,
  next: UpdateComponentFields
): ComponentNutritionEstimate | null {
  const quantityUnitUnchanged = next.quantity === previous.quantity && next.unit === previous.unit;
  const gramsChanged =
    next.estimated_grams_low !== previous.estimated_grams_low ||
    next.estimated_grams_high !== previous.estimated_grams_high;

  if (next.name !== previous.name || !quantityUnitUnchanged || !gramsChanged) {
    return null;
  }
  if (
    previous.estimated_grams_low == null ||
    previous.estimated_grams_high == null ||
    next.estimated_grams_low == null ||
    next.estimated_grams_high == null
  ) {
    return null;
  }

  const previousMidpoint = (previous.estimated_grams_low + previous.estimated_grams_high) / 2;
  const nextMidpoint = (next.estimated_grams_low + next.estimated_grams_high) / 2;
  if (previousMidpoint <= 0 || nextMidpoint <= 0) {
    return null;
  }

  const factor = nextMidpoint / previousMidpoint;
  return { nutrition: scaleRanges(previous.nutrition, factor), confidence: previous.confidence };
}

// The mobile add-component form can't estimate nutrition itself (no AI
// access, no photo), so it submits this all-zero sentinel for a brand-new
// component — the bulk PATCH handler scans for it to know which entries
// still need a real AI estimate before being stored.
export function isZeroNutrition(nutrition: NutrientRanges): boolean {
  return NUTRIENT_KEYS.every((key) => nutrition[key].low === 0 && nutrition[key].high === 0);
}

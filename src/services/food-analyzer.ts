import { analyzeImageNutrition, recalculateComponentNutrition } from "../ai/openai-client";
import { buildComponentRecalculationPrompt } from "../ai/prompts";
import {
  MealAnalysisSchema,
  RawMealAnalysisSchema,
  MealAnalysis,
  MealComponent,
  UpdateComponentFields,
  ComponentNutritionEstimate,
  ComponentNutritionEstimateSchema,
} from "../ai/schemas";
import { computeDishNutrition, roundNutrientRanges, scaleByGrams, scaleByQuantity } from "./nutrition-math";

export class FoodAnalyzerService {
  async analyzeFood(imageBuffer: Buffer, mimeType: string): Promise<MealAnalysis> {
    console.log("Starting food analysis...");

    // Call OpenAI Vision API
    const response = await analyzeImageNutrition(imageBuffer, mimeType);
    console.log("OpenAI response received");

    // Parse and validate response
    let parsedResponse: unknown;
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const jsonStr = jsonMatch[0];
      parsedResponse = JSON.parse(jsonStr);

      // Validate the model's own output (no top-level nutrition totals
      // expected — see RawMealAnalysisSchema)
      const rawValidated = RawMealAnalysisSchema.parse(parsedResponse);

      // Round each component's nutrition to the app's display precision
      // (calories: whole number, everything else: 2dp) immediately, rather
      // than leaving raw AI-precision numbers on components and only
      // rounding the dish-level total — otherwise a component's own figures
      // never match the same rounding convention as the total, and adding
      // up what's shown per component wouldn't equal what the dish card
      // shows.
      const components = rawValidated.components.map((component) => ({
        ...component,
        nutrition: roundNutrientRanges(component.nutrition),
      }));

      // Every nutrition total is derived from the (now-rounded) components,
      // not estimated holistically by the model, so that each total always
      // exactly matches the sum of its parts (low-to-low, high-to-high).
      const nutrition = computeDishNutrition(components);

      // Re-validate the completed shape as a safety net
      const validated = MealAnalysisSchema.parse({
        ...rawValidated,
        components,
        nutrition,
      });
      console.log("Analysis validated successfully");

      return validated;
    } catch (error) {
      console.error("Failed to parse nutrition data:", error);
      throw new Error(
        `Failed to parse nutrition analysis: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async runComponentEstimate(prompt: string): Promise<ComponentNutritionEstimate> {
    const response = await recalculateComponentNutrition(prompt);
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }
      const parsedResponse = JSON.parse(jsonMatch[0]);
      const estimate = ComponentNutritionEstimateSchema.parse(parsedResponse);
      return { ...estimate, nutrition: roundNutrientRanges(estimate.nutrition) };
    } catch (error) {
      console.error("Failed to parse component estimate:", error);
      throw new Error(
        `Failed to parse component estimate: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  // AI re-estimate of one existing component's nutrition — text-only (no
  // photo), anchored on the component's previous portion + nutrition. Only
  // reached when the edit doesn't cleanly match a deterministic scaling
  // case (see resolveComponentUpdate).
  async reestimateComponent(
    previous: MealComponent,
    next: UpdateComponentFields
  ): Promise<ComponentNutritionEstimate> {
    return this.runComponentEstimate(buildComponentRecalculationPrompt(previous, next));
  }

  // AI estimate for a component with no prior estimate at all — a brand
  // new entry added by the user (see isZeroNutrition in nutrition-math.ts
  // for how the bulk components PATCH detects these).
  async estimateNewComponent(fields: UpdateComponentFields): Promise<ComponentNutritionEstimate> {
    return this.runComponentEstimate(buildComponentRecalculationPrompt(undefined, fields));
  }

  // Entry point for the single-component edit endpoint: try the cheap,
  // deterministic scaling strategies first (same-unit quantity change, or a
  // grams-ratio change — see nutrition-math.ts) and only fall back to an
  // AI call when the edit doesn't cleanly match either shape (name changed,
  // unit label changed without a matching grams edit, both portion
  // representations changed at once, or there's no baseline to scale from).
  async resolveComponentUpdate(
    previous: MealComponent,
    next: UpdateComponentFields
  ): Promise<ComponentNutritionEstimate> {
    const deterministic = scaleByQuantity(previous, next) ?? scaleByGrams(previous, next);
    if (deterministic) {
      console.log("Component update resolved deterministically (no AI call)");
      return deterministic;
    }
    return this.reestimateComponent(previous, next);
  }
}

export const foodAnalyzerService = new FoodAnalyzerService();

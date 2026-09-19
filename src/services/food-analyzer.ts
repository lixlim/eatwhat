import { analyzeImageNutrition } from "../ai/openai-client";
import {
  MealAnalysisSchema,
  RawMealAnalysisSchema,
  MealAnalysis,
  NutrientRanges,
  NUTRIENT_KEYS,
} from "../ai/schemas";

export class FoodAnalyzerService {
  async analyzeFood(imageBuffer: Buffer): Promise<MealAnalysis> {
    console.log("Starting food analysis...");

    // Call OpenAI Vision API
    const response = await analyzeImageNutrition(imageBuffer);
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

      // Every nutrition total is derived from the components, not estimated
      // holistically by the model, so that each total always exactly matches
      // the sum of its parts (low-to-low, high-to-high).
      const nutrition = NUTRIENT_KEYS.reduce((totals, key) => {
        const sum = rawValidated.components.reduce(
          (sum, component) => ({
            low: sum.low + component.nutrition[key].low,
            high: sum.high + component.nutrition[key].high,
          }),
          { low: 0, high: 0 }
        );
        totals[key] = {
          low: Math.round(sum.low * 100) / 100,
          high: Math.round(sum.high * 100) / 100,
        };
        return totals;
      }, {} as NutrientRanges);

      // Re-validate the completed shape as a safety net
      const validated = MealAnalysisSchema.parse({
        ...rawValidated,
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
}

export const foodAnalyzerService = new FoodAnalyzerService();

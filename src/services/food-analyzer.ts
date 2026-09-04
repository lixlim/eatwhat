import { analyzeImageNutrition } from "../ai/openai-client";
import { MealAnalysisSchema, MealAnalysis } from "../ai/schemas";

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

      // Validate with schema
      const validated = MealAnalysisSchema.parse(parsedResponse);
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

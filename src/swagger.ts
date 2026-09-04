import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Food Nutrition Analyzer API",
      version: "0.1.0",
      description:
        "Accepts food images and uses OpenAI's Vision API to analyze their nutritional value.",
    },
    servers: [{ url: "/" }],
    components: {
      schemas: {
        Range: {
          type: "object",
          properties: {
            low: { type: "number" },
            high: { type: "number" },
          },
          required: ["low", "high"],
        },
        MealComponent: {
          type: "object",
          properties: {
            name: { type: "string" },
            estimated_grams_low: { type: "number", nullable: true },
            estimated_grams_high: { type: "number", nullable: true },
            confidence: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["name", "estimated_grams_low", "estimated_grams_high", "confidence"],
        },
        MealAnalysis: {
          type: "object",
          properties: {
            dish_name: { type: "string" },
            dish_name_local: { type: "string", nullable: true },
            components: {
              type: "array",
              items: { $ref: "#/components/schemas/MealComponent" },
            },
            nutrition: {
              type: "object",
              properties: {
                calories_kcal: { $ref: "#/components/schemas/Range" },
                protein_g: { $ref: "#/components/schemas/Range" },
                carbs_g: { $ref: "#/components/schemas/Range" },
                fat_g: { $ref: "#/components/schemas/Range" },
                fibre_g: { $ref: "#/components/schemas/Range" },
                sodium_mg: { $ref: "#/components/schemas/Range" },
              },
            },
            overall_confidence: { type: "string", enum: ["low", "medium", "high"] },
            uncertainties: { type: "array", items: { type: "string" } },
            interpretation: { type: "string" },
            disclaimer: { type: "string" },
          },
        },
        NutritionRecord: {
          allOf: [
            { $ref: "#/components/schemas/MealAnalysis" },
            {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                imageUrl: { type: "string" },
                analyzedAt: { type: "string", format: "date-time" },
              },
              required: ["id", "analyzedAt"],
            },
          ],
        },
        NutritionSummary: {
          type: "object",
          properties: {
            totalCalories: { $ref: "#/components/schemas/Range" },
            totalProtein: { $ref: "#/components/schemas/Range" },
            totalCarbs: { $ref: "#/components/schemas/Range" },
            totalFat: { $ref: "#/components/schemas/Range" },
            totalFibre: { $ref: "#/components/schemas/Range" },
            totalSodium: { $ref: "#/components/schemas/Range" },
            itemCount: { type: "number" },
            avgConfidence: { type: "string", enum: ["low", "medium", "high"] },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/api/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);

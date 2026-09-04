import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./openapi-registry";
import "./ai/schemas";
import "./models/nutrition";
import "./api/food.controller";

const generator = new OpenApiGeneratorV3(registry.definitions);

export const swaggerSpec = generator.generateDocument({
  openapi: "3.0.0",
  info: {
    title: "Food Nutrition Analyzer API",
    version: "0.1.0",
    description:
      "Accepts food images and uses OpenAI's Vision API to analyze their nutritional value.",
  },
  servers: [{ url: "/" }],
});

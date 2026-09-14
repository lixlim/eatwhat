import { Router, Request, Response } from "express";
import { z } from "zod";
import { foodAnalyzerService } from "../services/food-analyzer";
import { nutritionService } from "../services/nutrition-service";
import { registry, ErrorSchema } from "../openapi-registry";
import { NutritionRecordSchema, NutritionSummarySchema } from "../models/nutrition";
import { MealComponentSchema } from "../ai/schemas";

const router = Router();

registry.registerPath({
  method: "post",
  path: "/api/food/analyze",
  summary: "Analyze a food image",
  description: "Accepts an image and returns nutritional analysis",
  tags: ["Food"],
  request: {
    body: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: z.object({
            image: z.string().openapi({ format: "binary" }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Nutrition analysis of the image",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: NutritionRecordSchema,
          }),
        },
      },
    },
    400: {
      description: "No image file provided",
      content: { "application/json": { schema: ErrorSchema } },
    },
    500: {
      description: "Analysis failed",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image file provided" });
      return;
    }

    console.log(`Analyzing image: ${req.file.originalname}`);

    // Analyze the food image
    const nutritionData = await foodAnalyzerService.analyzeFood(
      req.file.buffer
    );

    // Store the record
    const record = nutritionService.addRecord(nutritionData);

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to analyze image",
    });
  }
});

registry.registerPath({
  method: "get",
  path: "/api/food/records",
  summary: "Get all analyzed food records",
  tags: ["Food"],
  responses: {
    200: {
      description: "List of all food records",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: z.array(NutritionRecordSchema),
            count: z.number(),
          }),
        },
      },
    },
  },
});
router.get("/records", (req: Request, res: Response) => {
  const records = nutritionService.getAllRecords();
  res.json({
    success: true,
    data: records,
    count: records.length,
  });
});

registry.registerPath({
  method: "get",
  path: "/api/food/summary",
  summary: "Get summary of all analyzed foods",
  tags: ["Food"],
  responses: {
    200: {
      description: "Aggregated nutrition summary",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: NutritionSummarySchema,
          }),
        },
      },
    },
  },
});
router.get("/summary", (req: Request, res: Response) => {
  const summary = nutritionService.getSummary();
  res.json({
    success: true,
    data: summary,
  });
});

registry.registerPath({
  method: "get",
  path: "/api/food/records/{id}",
  summary: "Get a specific food record by ID",
  tags: ["Food"],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "The matching food record",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: NutritionRecordSchema,
          }),
        },
      },
    },
    404: {
      description: "Record not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
router.get("/records/:id", (req: Request, res: Response) => {
  const record = nutritionService.getRecord(req.params.id);

  if (!record) {
    res.status(404).json({
      success: false,
      error: "Record not found",
    });
    return;
  }

  res.json({
    success: true,
    data: record,
  });
});

registry.registerPath({
  method: "patch",
  path: "/api/food/records/{id}/components",
  summary: "Amend, add, or remove the detected meal components on a record",
  description:
    "Replaces the components list for a record. Nutrition values are not affected and cannot be set through this endpoint.",
  tags: ["Food"],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      required: true,
      content: {
        "application/json": {
          schema: z.object({ components: z.array(MealComponentSchema) }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "The record with its updated components",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            data: NutritionRecordSchema,
          }),
        },
      },
    },
    400: {
      description: "Invalid components payload",
      content: { "application/json": { schema: ErrorSchema } },
    },
    404: {
      description: "Record not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
router.patch("/records/:id/components", (req: Request, res: Response) => {
  const parsed = z.object({ components: z.array(MealComponentSchema) }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: parsed.error.issues.map((issue) => issue.message).join("; "),
    });
    return;
  }

  const record = nutritionService.updateComponents(req.params.id, parsed.data.components);

  if (!record) {
    res.status(404).json({
      success: false,
      error: "Record not found",
    });
    return;
  }

  res.json({
    success: true,
    data: record,
  });
});

registry.registerPath({
  method: "delete",
  path: "/api/food/records/{id}",
  summary: "Delete a food record",
  tags: ["Food"],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: "Record deleted",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean().openapi({ example: true }),
            message: z.string(),
          }),
        },
      },
    },
    404: {
      description: "Record not found",
      content: { "application/json": { schema: ErrorSchema } },
    },
  },
});
router.delete("/records/:id", (req: Request, res: Response) => {
  const deleted = nutritionService.deleteRecord(req.params.id);

  if (!deleted) {
    res.status(404).json({
      success: false,
      error: "Record not found",
    });
    return;
  }

  res.json({
    success: true,
    message: "Record deleted",
  });
});

export default router;

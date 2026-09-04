import { Router, Request, Response } from "express";
import { foodAnalyzerService } from "../services/food-analyzer";
import { nutritionService } from "../services/nutrition-service";

const router = Router();

/**
 * @openapi
 * /api/food/analyze:
 *   post:
 *     summary: Analyze a food image
 *     description: Accepts an image and returns nutritional analysis
 *     tags: [Food]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *             required: [image]
 *     responses:
 *       200:
 *         description: Nutrition analysis of the image
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/NutritionRecord' }
 *       400:
 *         description: No image file provided
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 *       500:
 *         description: Analysis failed
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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

/**
 * @openapi
 * /api/food/records:
 *   get:
 *     summary: Get all analyzed food records
 *     tags: [Food]
 *     responses:
 *       200:
 *         description: List of all food records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/NutritionRecord' }
 *                 count: { type: number }
 */
router.get("/records", (req: Request, res: Response) => {
  const records = nutritionService.getAllRecords();
  res.json({
    success: true,
    data: records,
    count: records.length,
  });
});

/**
 * @openapi
 * /api/food/summary:
 *   get:
 *     summary: Get summary of all analyzed foods
 *     tags: [Food]
 *     responses:
 *       200:
 *         description: Aggregated nutrition summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/NutritionSummary' }
 */
router.get("/summary", (req: Request, res: Response) => {
  const summary = nutritionService.getSummary();
  res.json({
    success: true,
    data: summary,
  });
});

/**
 * @openapi
 * /api/food/records/{id}:
 *   get:
 *     summary: Get a specific food record by ID
 *     tags: [Food]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: The matching food record
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/NutritionRecord' }
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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

/**
 * @openapi
 * /api/food/records/{id}:
 *   delete:
 *     summary: Delete a food record
 *     tags: [Food]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string }
 *       404:
 *         description: Record not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
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

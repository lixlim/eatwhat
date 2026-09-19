import { Router } from "express";
import { z } from "zod";
import { foodAnalyzerService } from "../services/food-analyzer";
import { nutritionService } from "../services/nutrition-service";
import { MealComponentSchema } from "../ai/schemas";
import { sendOk, sendMessage, sendError } from "./respond";

const router = Router();

// The one client-facing request body in this API — validated because a
// malformed payload here would otherwise corrupt a stored record or throw
// deep inside nutritionService instead of failing cleanly with a 400.
const UpdateComponentsBodySchema = z.object({ components: z.array(MealComponentSchema) });

router.post("/analyze", async (req, res) => {
  try {
    if (!req.file) {
      sendError(res, 400, "No image file provided");
      return;
    }

    console.log(`Analyzing image: ${req.file.originalname}`);

    const nutritionData = await foodAnalyzerService.analyzeFood(req.file.buffer);
    const record = nutritionService.addRecord(nutritionData);

    sendOk(res, record);
  } catch (error) {
    console.error("Analysis error:", error);
    sendError(res, 500, error instanceof Error ? error.message : "Failed to analyze image");
  }
});

router.get("/records", (req, res) => {
  const records = nutritionService.getAllRecords();
  sendOk(res, records, { count: records.length });
});

router.get("/summary", (req, res) => {
  sendOk(res, nutritionService.getSummary());
});

router.get("/records/:id", (req, res) => {
  const record = nutritionService.getRecord(req.params.id);
  if (!record) {
    sendError(res, 404, "Record not found");
    return;
  }
  sendOk(res, record);
});

router.patch("/records/:id/components", (req, res) => {
  const parsed = UpdateComponentsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.issues.map((issue) => issue.message).join("; "));
    return;
  }

  const record = nutritionService.updateComponents(req.params.id, parsed.data.components);
  if (!record) {
    sendError(res, 404, "Record not found");
    return;
  }

  sendOk(res, record);
});

router.delete("/records/:id", (req, res) => {
  const deleted = nutritionService.deleteRecord(req.params.id);
  if (!deleted) {
    sendError(res, 404, "Record not found");
    return;
  }
  sendMessage(res, "Record deleted");
});

export default router;

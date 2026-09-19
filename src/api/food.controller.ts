import { Router } from "express";
import { z } from "zod";
import { foodAnalyzerService } from "../services/food-analyzer";
import { nutritionService } from "../services/nutrition-service";
import { MealComponentSchema, UpdateComponentFieldsSchema } from "../ai/schemas";
import { isZeroNutrition } from "../services/nutrition-math";
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

    const nutritionData = await foodAnalyzerService.analyzeFood(req.file.buffer, req.file.mimetype);
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

router.patch("/records/:id/components", async (req, res) => {
  const parsed = UpdateComponentsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.issues.map((issue) => issue.message).join("; "));
    return;
  }

  try {
    // The mobile add-component form can't estimate nutrition itself, so a
    // brand-new entry arrives with the all-zero sentinel (isZeroNutrition) —
    // give it a real AI estimate before it's stored. Existing entries
    // (edited via the single-component endpoint, or just carried through
    // unchanged for an add/remove) are left exactly as sent.
    const components = await Promise.all(
      parsed.data.components.map(async (component) => {
        if (!isZeroNutrition(component.nutrition)) {
          return component;
        }
        const estimate = await foodAnalyzerService.estimateNewComponent(component);
        return { ...component, nutrition: estimate.nutrition, confidence: estimate.confidence };
      })
    );

    const record = nutritionService.updateComponents(req.params.id, components);
    if (!record) {
      sendError(res, 404, "Record not found");
      return;
    }

    sendOk(res, record);
  } catch (error) {
    console.error("Bulk component update error:", error);
    sendError(res, 500, error instanceof Error ? error.message : "Failed to update components");
  }
});

// Edits one component's name/quantity/unit. nutrition/confidence are never
// accepted from the client (UpdateComponentFieldsSchema omits them) — they
// always come back from FoodAnalyzerService#resolveComponentUpdate, which
// tries deterministic scaling before falling back to an AI re-estimate (see
// nutrition-math.ts).
router.patch("/records/:id/components/:index", async (req, res) => {
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0) {
    sendError(res, 400, "Invalid component index");
    return;
  }

  const parsed = UpdateComponentFieldsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 400, parsed.error.issues.map((issue) => issue.message).join("; "));
    return;
  }

  const record = nutritionService.getRecord(req.params.id);
  if (!record) {
    sendError(res, 404, "Record not found");
    return;
  }

  const previous = record.components[index];
  if (!previous) {
    sendError(res, 404, "Component not found");
    return;
  }

  try {
    const estimate = await foodAnalyzerService.resolveComponentUpdate(previous, parsed.data);
    const updated = nutritionService.updateComponentAt(req.params.id, index, {
      ...parsed.data,
      nutrition: estimate.nutrition,
      confidence: estimate.confidence,
    });
    if (!updated) {
      sendError(res, 404, "Record not found");
      return;
    }
    sendOk(res, updated);
  } catch (error) {
    console.error("Component recalculation error:", error);
    sendError(res, 500, error instanceof Error ? error.message : "Failed to recalculate component");
  }
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

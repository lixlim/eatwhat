import OpenAI from "openai";
import { NUTRITION_ANALYSIS_PROMPT } from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeImageNutrition(imageBuffer: Buffer, mimeType: string): Promise<string> {
  const base64Image = imageBuffer.toString("base64");

  const startedAt = Date.now();
  const response = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    max_completion_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${base64Image}`,
            },
          },
          {
            type: "text",
            text: NUTRITION_ANALYSIS_PROMPT,
          },
        ],
      },
    ],
  });
  const elapsedMs = Date.now() - startedAt;

  console.log(
    `[openai] image ${imageBuffer.length}B, ` +
      `request ${elapsedMs}ms, tokens prompt=${response.usage?.prompt_tokens ?? "?"} ` +
      `completion=${response.usage?.completion_tokens ?? "?"} total=${response.usage?.total_tokens ?? "?"}`
  );

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error("Unexpected response format from OpenAI");
  }

  return responseText;
}

// Text-only re-estimate for a single edited component (see
// buildComponentRecalculationPrompt) — no image, so no vision tokens and a
// much smaller response than the full dish analysis.
export async function recalculateComponentNutrition(prompt: string): Promise<string> {
  const startedAt = Date.now();
  const response = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    max_completion_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });
  const elapsedMs = Date.now() - startedAt;

  console.log(
    `[openai] component recalc, request ${elapsedMs}ms, tokens prompt=${response.usage?.prompt_tokens ?? "?"} ` +
      `completion=${response.usage?.completion_tokens ?? "?"} total=${response.usage?.total_tokens ?? "?"}`
  );

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error("Unexpected response format from OpenAI");
  }

  return responseText;
}

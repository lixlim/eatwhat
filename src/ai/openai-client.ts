import OpenAI from "openai";
import { NUTRITION_ANALYSIS_PROMPT } from "./prompts";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeImageNutrition(imageBuffer: Buffer): Promise<string> {
  const base64Image = imageBuffer.toString("base64");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
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

  const responseText = response.choices[0]?.message?.content;
  if (!responseText) {
    throw new Error("Unexpected response format from OpenAI");
  }

  return responseText;
}

import { File } from "expo-file-system";
import { API_BASE_URL, ANALYZE_ENDPOINT } from "./config";
import { MealAnalysis, MealComponent, SelectedImage } from "./types";

export async function analyzeMeal(image: SelectedImage): Promise<MealAnalysis> {
  // SDK 57 installs the WinterCG-compliant `expo/fetch` as the global fetch,
  // which only accepts real Blob/File parts in FormData — not React Native's
  // legacy `{ uri, name, type }` object (that throws "Unsupported FormData
  // part implementation"). expo-file-system's File class implements Blob.
  const formData = new FormData();
  formData.append("image", new File(image.uri));

  // Don't set Content-Type manually — fetch needs to generate the multipart
  // boundary itself; a fixed header here would break the upload.
  const response = await fetch(ANALYZE_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body || body.success === false) {
    const message = body && body.error ? body.error : "Something went wrong. Please try again.";
    throw new Error(message);
  }

  return body.data as MealAnalysis;
}

export async function updateComponents(
  recordId: string,
  components: MealComponent[]
): Promise<MealAnalysis> {
  const response = await fetch(`${API_BASE_URL}/api/food/records/${encodeURIComponent(recordId)}/components`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ components }),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body || body.success === false) {
    const message = body && body.error ? body.error : "Couldn't save changes";
    throw new Error(message);
  }

  return body.data as MealAnalysis;
}

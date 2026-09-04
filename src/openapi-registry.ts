import { z } from "zod";
import { extendZodWithOpenApi, OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const registry = new OpenAPIRegistry();

export const ErrorSchema = registry.register(
  "Error",
  z.object({
    success: z.boolean().openapi({ example: false }),
    error: z.string(),
  })
);

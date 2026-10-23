import { z } from "zod";

const aiSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  AI_MODEL: z.string().min(1).default("gpt-4o-mini"),
});

// Server-only. Call from route handlers or server code, never from client components.
export function aiEnv() {
  return aiSchema.parse({
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_MODEL: process.env.AI_MODEL || undefined,
  });
}
import { z } from "zod";

const aiSchema = z.object({
  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_MODEL: z.string().min(1).default("openai/gpt-4o-mini"),
  NEXT_PUBLIC_SITE_URL: z.string().default("https://sthamly.com"),
});

// Server-only. Call from route handlers or server code, never from client components.
export function aiEnv() {
  return aiSchema.parse({
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || undefined,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  });
}
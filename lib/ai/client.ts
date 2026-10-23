import { aiEnv } from "@/lib/env";

// OpenRouter is OpenAI-compatible. Server-only.
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 20_000;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ChatOptions = {
  maxTokens?: number;
  temperature?: number;
};

export class AIError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "AIError";
  }
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const env = aiEnv();

  let response: Response;
  try {
    response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        // OpenRouter uses these to identify the app in its dashboard.
        "HTTP-Referer": env.NEXT_PUBLIC_SITE_URL,
        "X-Title": "Sthamly",
      },
      body: JSON.stringify({
        model: env.OPENROUTER_MODEL,
        messages,
        max_tokens: options.maxTokens ?? 400,
        temperature: options.temperature ?? 0.2,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Do not include the error body or the request in logs: it may contain health text.
    throw new AIError("AI provider unreachable");
  }

  if (!response.ok) {
    throw new AIError("AI provider returned an error", response.status);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string | null } }[];
  };

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new AIError("Empty AI response");
  }

  return text;
}
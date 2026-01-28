/**
 * OpenAI API Utilities
 * Consolidated OpenAI client for all apps
 */

export type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AppContext = "admin" | "teacher" | "student";

/**
 * Get OpenAI configuration based on app context
 * Each app can use different models via env vars
 */
export function getOpenAIConfig(context: AppContext = "student") {
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim();
  const apiKey = (process.env.OPENAI_API_KEY || "").trim();

  // Select model based on context
  let model: string;
  switch (context) {
    case "admin":
      model = (process.env.OPENAI_MODEL_ADMIN || "gpt-4o").trim();
      break;
    case "teacher":
      model = (process.env.OPENAI_MODEL_TEACHER || "gpt-4o").trim();
      break;
    case "student":
    default:
      model = (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
      break;
  }

  return { baseUrl, apiKey, model };
}

/**
 * Call OpenAI Chat Completions API
 */
export async function callOpenAIChatCompletions(args: {
  messages: OpenAIChatMessage[];
  temperature?: number;
  max_tokens?: number;
  context?: AppContext;
}) {
  const config = getOpenAIConfig(args.context);
  if (!config.apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: args.messages,
      temperature: args.temperature ?? (args.context === "student" ? 0.7 : 0.4),
      max_tokens: args.max_tokens ?? (args.context === "student" ? 2048 : 1800),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  return (await res.json()) as {
    choices: { message?: { role: string; content?: string } }[];
    model?: string;
  };
}

/**
 * Call OpenAI Embeddings API (for vector search)
 * Only available in student app currently
 */
export async function callOpenAIEmbeddings(args: { input: string[]; model?: string }) {
  const config = getOpenAIConfig("student");
  if (!config.apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable");
  }

  const res = await fetch(`${config.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: args.model || "text-embedding-3-small",
      input: args.input,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings error ${res.status}: ${text}`);
  }

  return (await res.json()) as {
    data: { embedding: number[] }[];
    model?: string;
  };
}

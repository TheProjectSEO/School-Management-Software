export type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function getOpenAIConfig() {
  return {
    baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").trim(),
    apiKey: (process.env.OPENAI_API_KEY || "").trim(),
    model: (process.env.OPENAI_MODEL_TEACHER || "gpt-4o").trim(),
  };
}

export async function callOpenAIChatCompletions(args: {
  messages: OpenAIChatMessage[];
  temperature?: number;
  max_tokens?: number;
}) {
  const config = getOpenAIConfig();
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
      temperature: args.temperature ?? 0.4,
      max_tokens: args.max_tokens ?? 1800,
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

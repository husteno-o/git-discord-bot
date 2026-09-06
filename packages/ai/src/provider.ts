import { config } from "@devpulse/config";
import { AppError } from "@devpulse/core";

export interface AIProvider {
  readonly name: string;
  isEnabled(): boolean;
  generateResponse(
    prompt: string,
    options?: { system?: string; maxTokens?: number },
  ): Promise<string>;
}

export class NoopAiProvider implements AIProvider {
  readonly name = "None";

  isEnabled(): boolean {
    return false;
  }

  async generateResponse(): Promise<string> {
    throw new AppError(
      "AI features are currently disabled. Set AI_PROVIDER and AI_API_KEY in your environment to enable optional AI capabilities.",
      "AI_DISABLED",
      400,
    );
  }
}

export class GenericOpenAiCompatibleProvider implements AIProvider {
  readonly name: string;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(
    name: string,
    apiKey: string,
    baseUrl = "https://api.openai.com/v1",
    model = "gpt-4o-mini",
  ) {
    this.name = name;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async generateResponse(
    prompt: string,
    options: { system?: string; maxTokens?: number } = {},
  ): Promise<string> {
    if (!this.apiKey) {
      throw new AppError("AI API key is missing.", "AI_NOT_CONFIGURED", 400);
    }

    const messages = [
      {
        role: "system",
        content:
          options.system ||
          "You are DevPulse AI, a senior software architect helping developers. Be concise, precise, and practical. Output valid Markdown.",
      },
      { role: "user", content: prompt },
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: options.maxTokens || 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new AppError(`AI provider error: ${errText}`, "AI_REQUEST_FAILED", 502);
    }

    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content || "No response generated.";
  }
}

export function getAiProvider(): AIProvider {
  const providerType = config.AI_PROVIDER;
  const apiKey = config.AI_API_KEY;

  if (!apiKey || providerType === "none") {
    return new NoopAiProvider();
  }

  if (providerType === "openai") {
    return new GenericOpenAiCompatibleProvider(
      "OpenAI",
      apiKey,
      "https://api.openai.com/v1",
      "gpt-4o-mini",
    );
  }

  if (providerType === "anthropic") {
    return new GenericOpenAiCompatibleProvider(
      "Anthropic",
      apiKey,
      "https://api.anthropic.com/v1",
      "claude-3-haiku",
    );
  }

  if (providerType === "gemini") {
    return new GenericOpenAiCompatibleProvider(
      "Gemini",
      apiKey,
      "https://generativelanguage.googleapis.com/v1beta/openai",
      "gemini-1.5-flash",
    );
  }

  return new NoopAiProvider();
}

export const aiProvider = getAiProvider();

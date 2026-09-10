import { config } from "@devpulse/config";
import { AppError } from "@devpulse/core";
import { logger } from "@devpulse/logger";

export interface AIProvider {
  readonly name: string;
  isEnabled(): boolean;
  generateResponse(
    prompt: string,
    options?: { system?: string; maxTokens?: number; temperature?: number },
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
  private maxRetries = 3;
  private retryDelayMs = 1000;

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
    options: { system?: string; maxTokens?: number; temperature?: number } = {},
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

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature ?? 0.3,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new AppError(`AI provider error: ${errText}`, "AI_REQUEST_FAILED", 502);
        }

        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new AppError("AI returned empty response", "AI_EMPTY_RESPONSE", 502);
        }
        return content;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          logger.warn(
            { attempt, provider: this.name, error: lastError.message },
            "AI request failed, retrying",
          );
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
        }
      }
    }

    throw lastError || new AppError("AI request failed after retries", "AI_RETRY_EXHAUSTED", 502);
  }
}

/**
 * OpenCode Zen AI Gateway Provider
 * Supports free-tier models (e.g. spark-1.3) that work WITHOUT an API key.
 * When an API key IS provided, it is sent as a Bearer token for higher rate limits.
 */
export class OpenCodeZenProvider implements AIProvider {
  readonly name: string;
  private apiKey: string | undefined;
  private baseUrl: string;
  private model: string;
  private maxRetries = 2;
  private retryDelayMs = 500;

  constructor(apiKey?: string, baseUrl = "https://opencode.ai/zen/v1", model = "spark-1.3") {
    this.name = `OpenCode Zen (${model})`;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  isEnabled(): boolean {
    return true;
  }

  async generateResponse(
    prompt: string,
    options: { system?: string; maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    const messages = [
      {
        role: "system",
        content:
          options.system ||
          "You are GITBOT AI, a senior software architect and security engineer. Be concise, precise, and practical. Output valid JSON when asked.",
      },
      { role: "user", content: prompt },
    ];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.apiKey) {
      headers.Authorization = `Bearer ${this.apiKey}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: this.model,
            messages,
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature ?? 0.3,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new AppError(
            `OpenCode Zen API error (${response.status}): ${errText}`,
            "AI_REQUEST_FAILED",
            502,
          );
        }

        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new AppError("AI returned empty response", "AI_EMPTY_RESPONSE", 502);
        }
        return content;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
        }
      }
    }

    throw lastError || new AppError("AI request failed after retries", "AI_RETRY_EXHAUSTED", 502);
  }
}

/**
 * Command Code Provider API — OpenAI-compatible endpoint.
 * Every top model on one API. Free tier includes longcat-2.0:free.
 * Requires an API key (create one at https://commandcode.ai/studio).
 * https://api.commandcode.ai/provider/v1
 */
export class CommandCodeProvider implements AIProvider {
  readonly name: string;
  private apiKey: string;
  private model: string;
  private maxRetries = 2;
  private retryDelayMs = 500;

  constructor(apiKey: string, model = "longcat-2.0:free") {
    this.name = `Command Code (${model})`;
    this.apiKey = apiKey;
    this.model = model;
  }

  isEnabled(): boolean {
    return Boolean(this.apiKey);
  }

  async generateResponse(
    prompt: string,
    options: { system?: string; maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    if (!this.apiKey) {
      throw new AppError(
        "Command Code API key is required. Get one at https://commandcode.ai/studio",
        "AI_NOT_CONFIGURED",
        400,
      );
    }

    const messages = [
      {
        role: "system",
        content:
          options.system ||
          "You are GITBOT AI, a senior software architect and security engineer. Be concise, precise, and practical. Output valid JSON when asked.",
      },
      { role: "user", content: prompt },
    ];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(
          "https://api.commandcode.ai/provider/v1/chat/completions",
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: this.model,
              messages,
              max_tokens: options.maxTokens || 2000,
              temperature: options.temperature ?? 0.3,
            }),
          },
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new AppError(
            `Command Code API error (${response.status}): ${errText}`,
            "AI_REQUEST_FAILED",
            502,
          );
        }

        const data = (await response.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          throw new AppError("AI returned empty response", "AI_EMPTY_RESPONSE", 502);
        }
        return content;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < this.maxRetries) {
          await new Promise((r) => setTimeout(r, this.retryDelayMs * attempt));
        }
      }
    }

    throw lastError || new AppError("AI request failed after retries", "AI_RETRY_EXHAUSTED", 502);
  }
}

/**
 * Fallback chain provider — tries each provider in order until one succeeds.
 * If all fail, throws the last error.
 */
export class FallbackChainProvider implements AIProvider {
  readonly name: string;
  private providers: AIProvider[];

  constructor(providers: AIProvider[]) {
    this.providers = providers;
    this.name = providers.map((p) => p.name).join(" → ");
  }

  isEnabled(): boolean {
    return this.providers.some((p) => p.isEnabled());
  }

  async generateResponse(
    prompt: string,
    options: { system?: string; maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      if (!provider.isEnabled()) continue;
      try {
        return await provider.generateResponse(prompt, options);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${provider.name}: ${msg}`);
      }
    }

    throw new AppError(
      `All AI providers failed:\n${errors.join("\n")}`,
      "AI_ALL_PROVIDERS_FAILED",
      502,
    );
  }
}

export function getAiProvider(): AIProvider {
  const providerType = config.AI_PROVIDER;
  const apiKey = config.AI_API_KEY;
  const baseUrl = config.AI_BASE_URL;
  const model = config.AI_MODEL;

  if (providerType === "none") {
    return new NoopAiProvider();
  }

  if (providerType === "commandcode") {
    if (!apiKey) return new NoopAiProvider();
    return new CommandCodeProvider(apiKey, model || "longcat-2.0:free");
  }

  if (providerType === "opencode") {
    return new OpenCodeZenProvider(
      apiKey,
      baseUrl || "https://opencode.ai/zen/v1",
      model || "spark-1.3",
    );
  }

  if (providerType === "spark") {
    return new FallbackChainProvider([
      new OpenCodeZenProvider(apiKey, baseUrl || "https://opencode.ai/zen/v1", "spark-1.3"),
      ...(apiKey ? [new CommandCodeProvider(apiKey, "longcat-2.0:free")] : []),
    ]);
  }

  if (!apiKey) {
    return new NoopAiProvider();
  }

  if (providerType === "openai") {
    return new GenericOpenAiCompatibleProvider(
      "OpenAI",
      apiKey,
      baseUrl || "https://api.openai.com/v1",
      model || "gpt-4o-mini",
    );
  }

  if (providerType === "anthropic") {
    return new GenericOpenAiCompatibleProvider(
      "Anthropic",
      apiKey,
      baseUrl || "https://api.anthropic.com/v1",
      model || "claude-3-haiku",
    );
  }

  if (providerType === "gemini") {
    return new GenericOpenAiCompatibleProvider(
      "Gemini",
      apiKey,
      baseUrl || "https://generativelanguage.googleapis.com/v1beta/openai",
      model || "gemini-1.5-flash",
    );
  }

  return new NoopAiProvider();
}

export const aiProvider = getAiProvider();
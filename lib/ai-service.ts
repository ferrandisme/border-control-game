import "server-only";

import { createCerebras } from "@ai-sdk/cerebras";
import { createGroq } from "@ai-sdk/groq";
import { createVercel } from "@ai-sdk/vercel";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  generateObject as sdkGenerateObject,
  generateText as sdkGenerateText,
  streamText as sdkStreamText,
  type ModelMessage,
} from "ai";
import { ZodError, ZodTypeAny } from "zod";

import { type AppLogger, getRequestLogger } from '@/lib/server-log';

type ProviderName = "groq" | "openrouter" | "cerebras" | "vercel" | "local";
export type AIPurpose = "traveler" | "chat";

const ALL_PROVIDERS: ProviderName[] = [
  "groq",
  "openrouter",
  "cerebras",
  "vercel",
  "local",
];
const DEFAULT_PROVIDER_ORDER: ProviderName[] = [
  "groq",
  "openrouter",
  "cerebras",
  "vercel",
];
const parsedCooldownMs = Number(
  process.env.AI_PROVIDER_COOLDOWN_MS ?? 10 * 60 * 1000,
);
const PROVIDER_COOLDOWN_MS =
  Number.isFinite(parsedCooldownMs) && parsedCooldownMs > 0
    ? parsedCooldownMs
    : 10 * 60 * 1000;
const providerCooldowns = new Map<string, number>();
const DEFAULT_REMOTE_PROVIDER_TIMEOUT_MS = 60_000;
const REMOTE_PROVIDER_TIMEOUT_MS = Number(
  process.env.AI_PROVIDER_TIMEOUT_MS ?? DEFAULT_REMOTE_PROVIDER_TIMEOUT_MS,
);

type GenerateObjectParams<TSchema extends ZodTypeAny> = {
  schema: TSchema;
  system: string;
  prompt: string;
  purpose: AIPurpose;
  preferredProvider?: ProviderName;
  repairObject?: (raw: unknown) => unknown;
  log?: AppLogger;
};

type StreamTextParams = {
  purpose: AIPurpose;
  system: string;
  messages: ModelMessage[];
  log?: AppLogger;
};

type GenerateObjectResult<TSchema extends ZodTypeAny> = {
  object: ReturnType<TSchema["parse"]>;
  providerUsed: ProviderName;
};

type StreamTextResult = {
  response: Response;
  providerUsed: ProviderName;
};

type StreamProbeResult = {
  response: Response;
};

type FallbackMetadata = {
  attemptedProviders: ProviderName[];
  failedProviders: ProviderName[];
};

const groqProvider = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

const openRouterProvider = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const cerebrasProvider = createCerebras({
  apiKey: process.env.CEREBRAS_API_KEY,
});

const vercelProvider = createVercel({
  apiKey: process.env.VERCEL_API_KEY,
});

const DEFAULT_MODELS: Record<AIPurpose, Record<ProviderName, string>> = {
  traveler: {
    groq: "moonshotai/kimi-k2-instruct-0905",
    openrouter: "stepfun/step-3.5-flash:free",
    cerebras: "qwen-3-235b-a22b-instruct-2507",
    vercel: "openai/gpt-4o-mini",
    local: "local-model",
  },
  chat: {
    groq: "moonshotai/kimi-k2-instruct-0905",
    openrouter: "stepfun/step-3.5-flash:free",
    cerebras: "qwen-3-235b-a22b-instruct-2507",
    vercel: "openai/gpt-4o-mini",
    local: "local-model",
  },
} as const;

const getLocalProviderUrl = (): string | undefined => {
  const value = process.env.BACKUP_PROVIDER_URL?.trim();
  return value && value.length > 0 ? value : undefined;
};

const getLocalProviderToken = (): string | undefined => {
  const value = (
    process.env.BACKUP_API_TOKEN ?? process.env.BACKUPL_API_TOKEN
  )?.trim();
  return value && value.length > 0 ? value : undefined;
};

const getLocalCloudflareClientId = (): string | undefined => {
  const value = process.env.BACKUP_CLOUDFLARE_ACCESS_CLIENT_ID?.trim();
  return value && value.length > 0 ? value : undefined;
};

const getLocalCloudflareClientSecret = (): string | undefined => {
  const value = process.env.BACKUP_CLOUDFLARE_ACCESS_CLIENT_SECRET?.trim();
  return value && value.length > 0 ? value : undefined;
};

const getLocalCloudflareAppSession = (): string | undefined => {
  const value = process.env.BACKUP_CF_APPSESSION?.trim();
  return value && value.length > 0 ? value : undefined;
};

const getLocalCloudflareAuthorization = (): string | undefined => {
  const value = process.env.BACKUP_CF_AUTHORIZATION?.trim();
  return value && value.length > 0 ? value : undefined;
};

const hasLocalProviderConfig = (): boolean => {
  return Boolean(
    getLocalProviderUrl() &&
    getLocalCloudflareClientId() &&
    getLocalCloudflareClientSecret(),
  );
};

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeSensitiveText = (value: string): string => {
  const sensitiveValues = [
    getLocalProviderUrl(),
    getLocalProviderToken(),
    getLocalCloudflareClientId(),
    getLocalCloudflareClientSecret(),
    getLocalCloudflareAppSession(),
    getLocalCloudflareAuthorization(),
  ].filter((entry): entry is string => Boolean(entry));

  return sensitiveValues.reduce((message, sensitiveValue) => {
    return message.replace(
      new RegExp(escapeRegExp(sensitiveValue), "g"),
      "[redacted]",
    );
  }, value);
};

const createProviderError = (
  message: string,
  statusCode?: number,
): Error & { statusCode?: number } => {
  const error = new Error(sanitizeSensitiveText(message)) as Error & {
    statusCode?: number;
  };
  if (statusCode !== undefined) {
    error.statusCode = statusCode;
  }
  return error;
};

const withProviderTimeout = async <T>(
  provider: ProviderName,
  operation: () => Promise<T>,
): Promise<T> => {
  if (provider === "local") {
    return operation();
  }

  const timeoutMs =
    Number.isFinite(REMOTE_PROVIDER_TIMEOUT_MS) && REMOTE_PROVIDER_TIMEOUT_MS > 0
      ? REMOTE_PROVIDER_TIMEOUT_MS
      : DEFAULT_REMOTE_PROVIDER_TIMEOUT_MS;

  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        createProviderError(
          `El proveedor ${provider} agotó el tiempo de espera tras ${Math.round(
            timeoutMs / 1000,
          )} segundos.`,
          408,
        ),
      );
    }, timeoutMs);

    operation()
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
};

const getErrorCode = (error: unknown): string | null => {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code.toLowerCase() : null;
  }

  return null;
};

const serializeMessageContent = (content: ModelMessage["content"]): string => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }

        if (
          typeof part === "object" &&
          part !== null &&
          "text" in part &&
          typeof part.text === "string"
        ) {
          return part.text;
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return "";
};

const buildLocalCandidateUrls = (): string[] => {
  const baseUrl = getLocalProviderUrl();

  if (!baseUrl) {
    throw createProviderError(
      "El proveedor local no está configurado correctamente.",
    );
  }

  const normalizedBaseUrl = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(baseUrl)
    ? baseUrl
    : `https://${baseUrl}`;
  const trimmedBaseUrl = normalizedBaseUrl.replace(/\/+$/, "");

  const alreadyExplicitChatPath = /\/(v1\/chat\/completions|chat\/completions)$/i.test(
    trimmedBaseUrl,
  );

  const candidates = alreadyExplicitChatPath
    ? [trimmedBaseUrl]
    : /\/v1$/i.test(trimmedBaseUrl)
      ? [`${trimmedBaseUrl}/chat/completions`, trimmedBaseUrl]
      : [`${trimmedBaseUrl}/v1/chat/completions`, trimmedBaseUrl];

  return Array.from(new Set(candidates));
};

type LocalProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const createLocalProviderHeaders = (): HeadersInit => {
  const token = getLocalProviderToken();
  const cloudflareClientId = getLocalCloudflareClientId();
  const cloudflareClientSecret = getLocalCloudflareClientSecret();
  const cloudflareAppSession = getLocalCloudflareAppSession();
  const cloudflareAuthorization = getLocalCloudflareAuthorization();

  if (!cloudflareClientId || !cloudflareClientSecret) {
    throw createProviderError(
      "El proveedor local no está configurado correctamente.",
    );
  }

  const cookieParts = [
    cloudflareAppSession
      ? `CF_AppSession=${cloudflareAppSession}`
      : null,
    cloudflareAuthorization
      ? `CF_Authorization=${cloudflareAuthorization}`
      : null,
  ].filter((value): value is string => Boolean(value));

  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "CF-Access-Client-Id": cloudflareClientId,
    "CF-Access-Client-Secret": cloudflareClientSecret,
    "Content-Type": "application/json",
    ...(cookieParts.length > 0 ? { Cookie: cookieParts.join('; ') } : {}),
  };
};

const createLocalProviderMessages = (
  system: string,
  messages: LocalProviderMessage[],
): LocalProviderMessage[] => {
  return [{ role: "system", content: system }, ...messages];
};

const extractTextFromUnknownContent = (value: unknown): string | null => {
  if (typeof value === "string") {
    return value.trim().length > 0 ? value : null;
  }

  if (Array.isArray(value)) {
    const text = value
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (typeof item === "object" && item !== null) {
          if ("text" in item && typeof item.text === "string") {
            return item.text;
          }

          if ("content" in item && typeof item.content === "string") {
            return item.content;
          }
        }

        return "";
      })
      .filter(Boolean)
      .join("\n")
      .trim();

    return text.length > 0 ? text : null;
  }

  if (typeof value === "object" && value !== null) {
    if (
      "text" in value &&
      typeof value.text === "string" &&
      value.text.trim().length > 0
    ) {
      return value.text;
    }

    if (
      "content" in value &&
      typeof value.content === "string" &&
      value.content.trim().length > 0
    ) {
      return value.content;
    }
  }

  return null;
};

const parseLocalProviderText = (rawBody: string): string => {
  const parsedPayload =
    rawBody.trim().length > 0 ? (JSON.parse(rawBody) as unknown) : null;

  const payload = parsedPayload as {
    choices?: Array<{
      message?: { content?: unknown };
      text?: unknown;
      delta?: { content?: unknown };
    }>;
    response?: unknown;
    content?: unknown;
    message?: unknown;
    output?: unknown;
    error?: unknown;
  } | null;

  if (payload?.error) {
    const lmError = payload.error as { message?: unknown; code?: unknown; type?: unknown } | string;
    const lmMessage = typeof lmError === 'string'
      ? lmError
      : typeof lmError?.message === 'string'
        ? lmError.message
        : 'El proveedor local devolvió un error.';

    throw createProviderError(lmMessage);
  }

  const candidates = [
    payload?.choices?.[0]?.message?.content,
    payload?.choices?.[0]?.text,
    payload?.choices?.[0]?.delta?.content,
    payload?.response,
    payload?.content,
    payload?.message,
    payload?.output,
  ];

  for (const candidate of candidates) {
    const text = extractTextFromUnknownContent(candidate);
    if (text) {
      return text;
    }
  }

  const trimmedBody = rawBody.trim();
  if (
    trimmedBody.length > 0 &&
    !trimmedBody.startsWith("{") &&
    !trimmedBody.startsWith("[")
  ) {
    return trimmedBody;
  }

  const topLevelKeys =
    payload && typeof payload === "object"
      ? Object.keys(payload).slice(0, 8).join(", ")
      : "none";
  const choiceKeys =
    payload?.choices?.[0] && typeof payload.choices[0] === "object"
      ? Object.keys(payload.choices[0]).slice(0, 8).join(", ")
      : "none";

  throw createProviderError(
    `El proveedor local devolvió una respuesta sin contenido útil. Claves recibidas: top-level=[${topLevelKeys}] choice=[${choiceKeys}]`,
  );
};

const isHtmlLikeResponse = (
  contentType: string | null,
  rawBody: string,
): boolean => {
  if (contentType?.toLowerCase().includes("text/html")) {
    return true;
  }

  const trimmedBody = rawBody.trim().toLowerCase();
  return (
    trimmedBody.startsWith("<!doctype html") || trimmedBody.startsWith("<html")
  );
};

const callLocalProvider = async (
  purpose: AIPurpose,
  messages: LocalProviderMessage[],
  stream: boolean,
  temperature = 0.2,
): Promise<Response> => {
  if (!hasLocalProviderConfig()) {
    throw createProviderError(
      "El proveedor local no está configurado en el entorno actual.",
    );
  }

  let lastError: Error | null = null;

  try {
    for (const candidateUrl of buildLocalCandidateUrls()) {
      const response = await fetch(candidateUrl, {
        method: "POST",
        headers: {
          ...createLocalProviderHeaders(),
          ...(stream ? { Accept: "text/event-stream" } : {}),
        },
        cache: "no-store",
        body: JSON.stringify({
          model: getModelId("local", purpose),
          messages,
          temperature,
          stream,
        }),
      });

      if (!response.ok) {
        lastError = createProviderError(
          `El proveedor local respondió con estado ${response.status}.`,
          response.status,
        );
        continue;
      }

      return response;
    }

    throw (
      lastError ??
      createProviderError(
        "El proveedor local no devolvió una respuesta válida.",
      )
    );
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      throw error;
    }

    throw createProviderError(
      error instanceof Error
        ? `No se pudo contactar con el proveedor local: ${error.message}`
        : "No se pudo contactar con el proveedor local.",
    );
  }
};

const generateTextWithLocalProvider = async (
  purpose: AIPurpose,
  system: string,
  prompt: string,
  temperature = 0.2,
): Promise<string> => {
  let lastError: Error | null = null;

  for (const candidateUrl of buildLocalCandidateUrls()) {
    try {
      const response = await fetch(candidateUrl, {
        method: "POST",
        headers: createLocalProviderHeaders(),
        cache: "no-store",
        body: JSON.stringify({
          model: getModelId("local", purpose),
          messages: createLocalProviderMessages(system, [
            { role: "user", content: prompt },
          ]),
          temperature,
          stream: false,
        }),
      });

      const rawBody = await response.text();

      if (!response.ok) {
        lastError = createProviderError(
          `El proveedor local respondió con estado ${response.status}.`,
          response.status,
        );
        continue;
      }

      if (isHtmlLikeResponse(response.headers.get("content-type"), rawBody)) {
        lastError = createProviderError(
          "El proveedor local devolvió HTML en lugar de una respuesta API válida.",
        );
        continue;
      }

      return parseLocalProviderText(rawBody);
    } catch (error) {
      lastError =
        error instanceof Error
          ? createProviderError(error.message)
          : createProviderError(
              "No se pudo procesar la respuesta del proveedor local.",
            );
    }
  }

  throw (
    lastError ??
    createProviderError("El proveedor local no devolvió una respuesta válida.")
  );
};

const streamTextWithLocalProvider = async (
  params: StreamTextParams,
): Promise<StreamTextResult> => {
  const messages = createLocalProviderMessages(
    params.system,
    params.messages.map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: serializeMessageContent(message.content),
    })),
  );

  const response = await callLocalProvider(params.purpose, messages, true, 0.7);

  if (!response.body) {
    throw createProviderError(
      "El proveedor local no devolvió un stream válido.",
    );
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("text/html")) {
    throw createProviderError(
      "El proveedor local devolvió HTML en lugar de un stream válido.",
    );
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let pendingBuffer = "";

  const adaptedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = response.body?.getReader();

      if (!reader) {
        controller.error(
          createProviderError(
            "El proveedor local no devolvió un stream legible.",
          ),
        );
        return;
      }

      const flushEvent = (eventBlock: string) => {
        const dataLines = eventBlock
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .filter(Boolean);

        for (const dataLine of dataLines) {
          if (dataLine === "[DONE]") {
            return;
          }

          try {
            const payload = JSON.parse(dataLine) as {
              choices?: Array<{
                delta?: { content?: unknown };
                message?: { content?: unknown };
                text?: unknown;
              }>;
            };
            const chunk =
              extractTextFromUnknownContent(
                payload.choices?.[0]?.delta?.content,
              ) ??
              extractTextFromUnknownContent(
                payload.choices?.[0]?.message?.content,
              ) ??
              extractTextFromUnknownContent(payload.choices?.[0]?.text);

            if (chunk) {
              controller.enqueue(encoder.encode(chunk));
            }
          } catch {
            if (dataLine.length > 0) {
              controller.enqueue(encoder.encode(dataLine));
            }
          }
        }
      };

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          pendingBuffer += decoder.decode(value, { stream: true });
          const events = pendingBuffer.split(/\r?\n\r?\n/);
          pendingBuffer = events.pop() ?? "";

          for (const eventBlock of events) {
            flushEvent(eventBlock);
          }
        }

        pendingBuffer += decoder.decode();
        const finalBlock = pendingBuffer.trim();

        if (finalBlock.length > 0) {
          if (finalBlock.startsWith("data:")) {
            flushEvent(finalBlock);
          } else {
            controller.enqueue(encoder.encode(finalBlock));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(
          createProviderError(
            error instanceof Error
              ? error.message
              : "Falló el stream del proveedor local.",
          ),
        );
      }
    },
  });

  return {
    response: buildStreamResponse(
      new Response(adaptedStream, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      }),
      "local",
      getModelId("local", params.purpose),
    ),
    providerUsed: "local",
  };
};

const getCooldownKey = (purpose: AIPurpose, provider: ProviderName): string =>
  `${purpose}:${provider}`;

const parseProviderOrder = (rawValue: string | undefined): ProviderName[] => {
  if (!rawValue) {
    return DEFAULT_PROVIDER_ORDER;
  }

  const parsedProviders = rawValue
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ProviderName =>
      ALL_PROVIDERS.includes(value as ProviderName),
    );

  if (parsedProviders.length === 0) {
    return DEFAULT_PROVIDER_ORDER;
  }

  const dedupedProviders = Array.from(new Set(parsedProviders));
  const missingProviders = DEFAULT_PROVIDER_ORDER.filter(
    (provider) => !dedupedProviders.includes(provider),
  );
  return [...dedupedProviders, ...missingProviders];
};

const getProviderOrder = (purpose: AIPurpose): ProviderName[] => {
  const purposeSpecificOrder =
    purpose === "chat"
      ? process.env.AI_PROVIDER_ORDER_CHAT
      : process.env.AI_PROVIDER_ORDER_TRAVELER;

  return parseProviderOrder(
    purposeSpecificOrder ?? process.env.AI_PROVIDER_ORDER,
  );
};

const getEnvModel = (
  provider: ProviderName,
  purpose: AIPurpose,
): string | undefined => {
  switch (provider) {
    case "groq":
      return purpose === "chat"
        ? (process.env.GROQ_MODEL_CHAT ?? process.env.GROQ_MODEL)
        : (process.env.GROQ_MODEL_TRAVELER ?? process.env.GROQ_MODEL);
    case "openrouter":
      return purpose === "chat"
        ? (process.env.OPENROUTER_MODEL_CHAT ?? process.env.OPENROUTER_MODEL)
        : (process.env.OPENROUTER_MODEL_TRAVELER ??
            process.env.OPENROUTER_MODEL);
    case "cerebras":
      return purpose === "chat"
        ? (process.env.CEREBRAS_MODEL_CHAT ?? process.env.CEREBRAS_MODEL)
        : (process.env.CEREBRAS_MODEL_TRAVELER ?? process.env.CEREBRAS_MODEL);
    case "vercel":
      return purpose === "chat"
        ? (process.env.VERCEL_MODEL_CHAT ?? process.env.VERCEL_MODEL)
        : (process.env.VERCEL_MODEL_TRAVELER ?? process.env.VERCEL_MODEL);
    case "local":
      return purpose === "chat"
        ? (process.env.BACKUP_PROVIDER_MODEL_CHAT ??
            process.env.BACKUP_PROVIDER_MODEL)
        : (process.env.BACKUP_PROVIDER_MODEL_TRAVELER ??
            process.env.BACKUP_PROVIDER_MODEL);
  }
};

const getModelId = (provider: ProviderName, purpose: AIPurpose): string => {
  return getEnvModel(provider, purpose) ?? DEFAULT_MODELS[purpose][provider];
};

const isConfigured = (provider: ProviderName): boolean => {
  switch (provider) {
    case "groq":
      return Boolean(process.env.GROQ_API_KEY);
    case "openrouter":
      return Boolean(process.env.OPENROUTER_API_KEY);
    case "cerebras":
      return Boolean(process.env.CEREBRAS_API_KEY);
    case "vercel":
      return Boolean(process.env.VERCEL_API_KEY);
    case "local":
      return hasLocalProviderConfig();
  }
};

const getProviderErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return sanitizeSensitiveText(error.message);
  }

  return "Unknown AI provider error";
};

const getStatusCode = (error: unknown): number | null => {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return typeof statusCode === "number" ? statusCode : null;
  }

  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : null;
  }

  return null;
};

const shouldFallback = (error: unknown): boolean => {
  const statusCode = getStatusCode(error);
  const message = getProviderErrorMessage(error).toLowerCase();
  const errorCode = getErrorCode(error);

  if (
    message.includes("response_format") ||
    message.includes("json schema") ||
    message.includes("does not validate") ||
    message.includes("generated json does not match")
  ) {
    return true;
  }

  if (statusCode === null) {
    return true;
  }

  return (
    [401, 403, 404, 408, 409, 425, 429, 500, 502, 503, 504].includes(statusCode) ||
    errorCode === "econnrefused" ||
    errorCode === "enotfound" ||
    errorCode === "eai_again" ||
    errorCode === "etimedout"
  );
};

const shouldCooldownProvider = (error: unknown): boolean => {
  const statusCode = getStatusCode(error);
  const message = getProviderErrorMessage(error).toLowerCase();
  const errorCode = getErrorCode(error);

  if (statusCode !== null) {
    return [401, 403, 404, 408, 425, 429, 500, 502, 503, 504].includes(statusCode);
  }

  return (
    errorCode === "econnrefused" ||
    errorCode === "enotfound" ||
    errorCode === "eai_again" ||
    errorCode === "etimedout" ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("invalid api key") ||
    message.includes("authentication") ||
    message.includes("fetch failed") ||
    message.includes("connect") ||
    message.includes("tls") ||
    message.includes("rate limit") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("econnreset") ||
    message.includes("network") ||
    message.includes("temporarily unavailable") ||
    message.includes("service unavailable")
  );
};

const isInCooldown = (purpose: AIPurpose, provider: ProviderName): boolean => {
  const key = getCooldownKey(purpose, provider);
  const blockedUntil = providerCooldowns.get(key);

  if (!blockedUntil) {
    return false;
  }

  if (blockedUntil <= Date.now()) {
    providerCooldowns.delete(key);
    return false;
  }

  return true;
};

const setProviderCooldown = (
  purpose: AIPurpose,
  provider: ProviderName,
): void => {
  const until = Date.now() + PROVIDER_COOLDOWN_MS;
  providerCooldowns.set(getCooldownKey(purpose, provider), until);
  console.warn(
    `[AI] Cooling down provider: ${provider} (${purpose}) until ${new Date(until).toISOString()}`,
  );
};

const clearProviderCooldown = (
  purpose: AIPurpose,
  provider: ProviderName,
): void => {
  providerCooldowns.delete(getCooldownKey(purpose, provider));
};

const configuredProviders = (
  purpose: AIPurpose,
  preferredProvider?: ProviderName,
): ProviderName[] => {
  const orderedPrimaryProviders: ProviderName[] = getProviderOrder(purpose)
    .filter(
      (provider): provider is Exclude<ProviderName, "local"> =>
        provider !== "local",
    )
    .filter(isConfigured);
  const effectivePrimaryOrder: ProviderName[] =
    preferredProvider &&
    preferredProvider !== "local" &&
    isConfigured(preferredProvider)
      ? [
          preferredProvider,
          ...orderedPrimaryProviders.filter(
            (provider) => provider !== preferredProvider,
          ),
        ]
      : orderedPrimaryProviders;
  const effectiveOrder: ProviderName[] = isConfigured("local")
    ? [...effectivePrimaryOrder, "local"]
    : effectivePrimaryOrder;

  const availableProviders = effectiveOrder.filter(
    (provider) => !isInCooldown(purpose, provider),
  );
  const providers = availableProviders;

  if (providers.length === 0) {
    throw new Error(
      "Todos los proveedores configurados están temporalmente en enfriamiento. Espera unos minutos o revisa las credenciales activas.",
    );
  }

  return providers;
};

const buildStreamResponse = (
  response: Response,
  providerUsed: ProviderName,
  modelUsed: string,
  fallbackMetadata?: FallbackMetadata,
): Response => {
  const headers = new Headers(response.headers);
  headers.set("X-AI-Provider", providerUsed);
  headers.set("X-AI-Model", modelUsed);
  if (fallbackMetadata) {
    headers.set(
      "X-AI-Attempted-Providers",
      fallbackMetadata.attemptedProviders.join(","),
    );
    headers.set(
      "X-AI-Failed-Providers",
      fallbackMetadata.failedProviders.join(","),
    );
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const createCommittedRemoteStreamResponse = async (
  provider: Exclude<ProviderName, "local">,
  purpose: AIPurpose,
  source: AsyncIterable<string>,
): Promise<StreamProbeResult> => {
  const iterator = source[Symbol.asyncIterator]();
  const bufferedChunks: string[] = [];
  let committed = false;

  while (true) {
    const next = await iterator.next();

    if (next.done) {
      break;
    }

    const chunk = next.value;
    if (typeof chunk !== "string") {
      continue;
    }

    bufferedChunks.push(chunk);

    if (chunk.trim().length > 0) {
      committed = true;
      break;
    }
  }

  if (!committed) {
    throw createProviderError(
      `El proveedor ${provider} no produjo contenido útil antes de cerrar el stream.`,
    );
  }

  const encoder = new TextEncoder();
  const proxiedStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const chunk of bufferedChunks) {
          controller.enqueue(encoder.encode(chunk));
        }

        while (true) {
          const next = await iterator.next();

          if (next.done) {
            break;
          }

          if (typeof next.value === "string" && next.value.length > 0) {
            controller.enqueue(encoder.encode(next.value));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(
          createProviderError(
            error instanceof Error
              ? error.message
              : `Falló el stream del proveedor ${provider}.`,
          ),
        );
      }
    },
    cancel() {
      void iterator.return?.();
    },
  });

  return {
    response: buildStreamResponse(
      new Response(proxiedStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      }),
      provider,
      getModelId(provider, purpose),
    ),
  };
};

const extractJsonPayload = (text: string): unknown => {
  const trimmed = text.trim();

  if (trimmed.length > 200_000) {
    throw new Error(
      "La respuesta del proveedor es demasiado grande para procesarse con seguridad.",
    );
  }

  try {
    return JSON.parse(trimmed);
  } catch {}

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch?.[1]?.trim() ?? trimmed;

  if (candidate.length > 200_000) {
    throw new Error(
      "La respuesta del proveedor es demasiado grande para procesarse con seguridad.",
    );
  }

  try {
    return JSON.parse(candidate);
  } catch {}

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(
      "La respuesta del proveedor no contiene un objeto JSON válido.",
    );
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
};

const formatValidationErrors = (error: ZodError): string => {
  return error.issues
    .slice(0, 24)
    .map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
};

const shouldUseTextObjectFallback = (provider: ProviderName): boolean => {
  return (
    provider === "cerebras" ||
    provider === "openrouter" ||
    provider === "groq" ||
    provider === "local"
  );
};

const getTopLevelObjectKeys = (schema: ZodTypeAny): string[] | null => {
  const def = (
    schema as {
      _def?: {
        shape?: (() => Record<string, unknown>) | Record<string, unknown>;
      };
    }
  )._def;

  if (!def) {
    return null;
  }

  const shape = typeof def.shape === "function" ? def.shape() : def.shape;

  if (!shape || typeof shape !== "object") {
    return null;
  }

  return Object.keys(shape);
};

const getLanguageModel = (provider: ProviderName, purpose: AIPurpose) => {
  switch (provider) {
    case "groq":
      return groqProvider(getModelId("groq", purpose));
    case "openrouter":
      return openRouterProvider.chat(getModelId("openrouter", purpose));
    case "cerebras":
      return cerebrasProvider(getModelId("cerebras", purpose));
    case "vercel":
      return vercelProvider(getModelId("vercel", purpose));
    case "local":
      throw createProviderError(
        "El proveedor local usa una integración HTTP directa.",
      );
  }
};

const generateObjectFromText = async <TSchema extends ZodTypeAny>(
  provider: ProviderName,
  params: GenerateObjectParams<TSchema>,
): Promise<GenerateObjectResult<TSchema>> => {
  const topLevelKeys = getTopLevelObjectKeys(params.schema);
  const schemaGuidance =
    topLevelKeys && topLevelKeys.length > 0
      ? `
- Include exactly these top-level keys: ${topLevelKeys.join(", ")}.
- Do not add any extra top-level keys.
- Do not omit any required top-level keys.`
      : `
- Match the requested schema exactly.
- Do not add any invented keys.
- Do not omit any required keys.`;

  const basePrompt = `${params.prompt}

INSTRUCCIONES CRÍTICAS DE FORMATO:
- Responde exclusivamente con UN objeto JSON válido.
- No uses markdown, bloques de código ni comentarios.${schemaGuidance}
- Usa solo claves y estructuras que pertenezcan al schema solicitado.
- Los valores deben ser concretos, plausibles y coherentes con las instrucciones.
- No inventes campos ni valores fuera del schema.
- No devuelvas texto adicional fuera del JSON.`;

  const buildPrompt = (retryContext?: string): string => {
    if (!retryContext) {
      return basePrompt;
    }

    return `${basePrompt}\n\n${retryContext}`;
  };

  let prompt = buildPrompt();

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const text =
        provider === "local"
          ? await generateTextWithLocalProvider(
              params.purpose,
              params.system,
              prompt,
              0.2,
            )
          : (
              await sdkGenerateText({
                model: getLanguageModel(provider, params.purpose),
                system: params.system,
                prompt,
                temperature: 0.2,
              })
            ).text;

      const extracted = extractJsonPayload(text);
      const parsed = params.schema.safeParse(extracted);

      if (parsed.success) {
        return {
          object: parsed.data as ReturnType<TSchema["parse"]>,
          providerUsed: provider,
        };
      }

      if (params.repairObject) {
        const repairedParsed = params.schema.safeParse(
          params.repairObject(extracted),
        );

        if (repairedParsed.success) {
          return {
            object: repairedParsed.data as ReturnType<TSchema["parse"]>,
            providerUsed: provider,
          };
        }
      }

      lastError = parsed.error;
      prompt = buildPrompt(
        `Tu respuesta anterior NO cumple el schema. Corrígela y devuelve el objeto JSON completo desde cero.\n\nDEVUELVE SOLO EL OBJETO JSON, SIN TEXTO ADICIONAL.\n\nErrores de validación:\n${formatValidationErrors(parsed.error)}\n\nJSON previo:\n${JSON.stringify(extracted, null, 2)}\n\nRecuerda:\n- incluye todas las claves requeridas\n- no inventes claves nuevas\n- usa los tipos y valores permitidos por el schema\n- conserva los datos correctos y corrige solo lo necesario\n- no expliques nada fuera del JSON`,
      );
    } catch (error) {
      lastError = error;

      const retryReason =
        error instanceof Error
          ? `Tu respuesta anterior no se pudo procesar como JSON válido. Corrígela y devuelve el objeto completo en JSON puro.\n\nDEVUELVE SOLO EL OBJETO JSON, SIN TEXTO ADICIONAL.\n\nError detectado:\n${getProviderErrorMessage(error)}`
          : "Tu respuesta anterior no se pudo procesar como JSON válido. Devuelve el objeto completo en JSON puro, sin texto adicional.";

      prompt = buildPrompt(retryReason);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo validar el JSON generado por el proveedor.");
};

const generateObjectWithProvider = async <TSchema extends ZodTypeAny>(
  provider: ProviderName,
  params: GenerateObjectParams<TSchema>,
): Promise<GenerateObjectResult<TSchema>> => {
  if (shouldUseTextObjectFallback(provider)) {
    return generateObjectFromText(provider, params);
  }

  switch (provider) {
    case "groq": {
      const result = await sdkGenerateObject({
        model: getLanguageModel("groq", params.purpose),
        schema: params.schema,
        system: params.system,
        prompt: params.prompt,
      });
      return {
        object: result.object as ReturnType<TSchema["parse"]>,
        providerUsed: provider,
      };
    }

    case "openrouter": {
      const result = await sdkGenerateObject({
        model: getLanguageModel("openrouter", params.purpose),
        schema: params.schema,
        system: params.system,
        prompt: params.prompt,
      });
      return {
        object: result.object as ReturnType<TSchema["parse"]>,
        providerUsed: provider,
      };
    }

    case "cerebras": {
      const result = await sdkGenerateObject({
        model: getLanguageModel("cerebras", params.purpose),
        schema: params.schema,
        system: params.system,
        prompt: params.prompt,
      });
      return {
        object: result.object as ReturnType<TSchema["parse"]>,
        providerUsed: provider,
      };
    }

    case "vercel": {
      const result = await sdkGenerateObject({
        model: getLanguageModel("vercel", params.purpose),
        schema: params.schema,
        system: params.system,
        prompt: params.prompt,
      });
      return {
        object: result.object as ReturnType<TSchema["parse"]>,
        providerUsed: provider,
      };
    }

    case "local": {
      return generateObjectFromText(provider, params);
    }
  }
};

const streamTextWithProvider = async (
  provider: ProviderName,
  params: StreamTextParams,
): Promise<StreamTextResult> => {
  if (provider === "local") {
    return streamTextWithLocalProvider(params);
  }

  switch (provider) {
    case "groq": {
      const result = sdkStreamText({
        model: getLanguageModel("groq", params.purpose),
        system: params.system,
        messages: params.messages,
      });
      return {
        response: (await createCommittedRemoteStreamResponse(
          provider,
          params.purpose,
          result.textStream,
        )).response,
        providerUsed: provider,
      };
    }

    case "openrouter": {
      const result = sdkStreamText({
        model: getLanguageModel("openrouter", params.purpose),
        system: params.system,
        messages: params.messages,
      });
      return {
        response: (await createCommittedRemoteStreamResponse(
          provider,
          params.purpose,
          result.textStream,
        )).response,
        providerUsed: provider,
      };
    }

    case "cerebras": {
      const result = sdkStreamText({
        model: getLanguageModel("cerebras", params.purpose),
        system: params.system,
        messages: params.messages,
      });
      return {
        response: (await createCommittedRemoteStreamResponse(
          provider,
          params.purpose,
          result.textStream,
        )).response,
        providerUsed: provider,
      };
    }

    case "vercel": {
      const result = sdkStreamText({
        model: getLanguageModel("vercel", params.purpose),
        system: params.system,
        messages: params.messages,
      });
      return {
        response: (await createCommittedRemoteStreamResponse(
          provider,
          params.purpose,
          result.textStream,
        )).response,
        providerUsed: provider,
      };
    }
  }
};

async function generateObject<TSchema extends ZodTypeAny>(
  params: GenerateObjectParams<TSchema>,
): Promise<GenerateObjectResult<TSchema> & { fallbackMetadata: FallbackMetadata }> {
  let lastError: unknown = null;
  const attemptedProviders: ProviderName[] = [];
  const failedProviders: ProviderName[] = [];

  const providers = configuredProviders(
    params.purpose,
    params.preferredProvider,
  );

  if (providers.length === 0) {
    throw new Error(
      "El proveedor solicitado no está configurado en el entorno actual.",
    );
  }

  for (const provider of providers) {
    attemptedProviders.push(provider);
    try {
      const result = await withProviderTimeout(provider, () =>
        generateObjectWithProvider(provider, params),
      );
      clearProviderCooldown(params.purpose, provider);

        const logMsg = `[AI] Using provider: ${provider}`;
        getRequestLogger(params.log).info(logMsg, { provider, purpose: params.purpose });

      return {
        ...result,
        fallbackMetadata: {
          attemptedProviders,
          failedProviders,
        },
      };
    } catch (error) {
      const errorMsg = getProviderErrorMessage(error);
      const warnMsg = `[AI] Provider failed: ${provider} - ${errorMsg}`;

      if (params.log) {
        params.log.warn(warnMsg, {
          provider,
          purpose: params.purpose,
          error: error instanceof Error ? error.message : String(error),
          statusCode: getStatusCode(error),
        });
      } else {
        console.warn(warnMsg);
      }

      lastError = error;
      failedProviders.push(provider);

      if (shouldCooldownProvider(error)) {
        setProviderCooldown(params.purpose, provider);
      }

      if (!shouldFallback(error)) {
        break;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Todos los proveedores de IA fallaron al generar el objeto.");
}

async function streamText(params: StreamTextParams): Promise<StreamTextResult> {
  let lastError: unknown = null;
  const attemptedProviders: ProviderName[] = [];
  const failedProviders: ProviderName[] = [];

  for (const provider of configuredProviders(params.purpose)) {
    attemptedProviders.push(provider);
    try {
      const result = await withProviderTimeout(provider, () =>
        streamTextWithProvider(provider, params),
      );
      clearProviderCooldown(params.purpose, provider);

        const logMsg = `[AI] Using provider: ${provider}`;
        getRequestLogger(params.log).info(logMsg, { provider, purpose: params.purpose });

      return {
        response: buildStreamResponse(
          result.response,
          result.providerUsed,
          result.response.headers.get("X-AI-Model") ?? getModelId(result.providerUsed, params.purpose),
          {
            attemptedProviders,
            failedProviders,
          },
        ),
        providerUsed: result.providerUsed,
      };
    } catch (error) {
      const errorMsg = getProviderErrorMessage(error);
      const warnMsg = `[AI] Provider failed: ${provider} - ${errorMsg}`;

      if (params.log) {
        params.log.warn(warnMsg, {
          provider,
          purpose: params.purpose,
          error: error instanceof Error ? error.message : String(error),
          statusCode: getStatusCode(error),
        });
      } else {
        console.warn(warnMsg);
      }

      lastError = error;
      failedProviders.push(provider);

      if (shouldCooldownProvider(error)) {
        setProviderCooldown(params.purpose, provider);
      }

      if (!shouldFallback(error)) {
        break;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "Todos los proveedores de IA fallaron al generar la conversación.",
      );
}

export const aiService = {
  generateObject,
  streamText,
};

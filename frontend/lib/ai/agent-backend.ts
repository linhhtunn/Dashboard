const DEFAULT_CHAT_PATH = "/api/agent/chat";
const DEFAULT_CHAT_STREAM_PATH = "/api/agent/chat/stream";

export function getAgentBaseUrl() {
  return process.env.AI_AGENT_BASE_URL;
}

export function isAgentBackendConfigured() {
  return Boolean(getAgentBaseUrl()?.trim());
}

/** Unified agent router — summary and explain-alert are chat intents. */
export function getAgentPath(kind: "chat" | "stream" = "chat") {
  if (kind === "stream") {
    return process.env.AI_AGENT_CHAT_STREAM_PATH ?? DEFAULT_CHAT_STREAM_PATH;
  }
  return process.env.AI_AGENT_CHAT_PATH ?? DEFAULT_CHAT_PATH;
}

export async function callAgentEndpoint({
  baseUrl,
  configuredPath,
  defaultPath,
  body,
}: {
  baseUrl: string;
  configuredPath: string;
  defaultPath: string;
  body: string;
}) {
  const attemptedPaths = Array.from(
    new Set([configuredPath, defaultPath]),
  ).filter(Boolean);

  let backendResponse: Response | null = null;
  let lastError: unknown = null;

  for (const path of attemptedPaths) {
    try {
      const candidate = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
        cache: "no-store",
      });

      if (candidate.status === 404 && path !== defaultPath) {
        continue;
      }

      backendResponse = candidate;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!backendResponse) {
    throw new Error(
      lastError instanceof Error
        ? `Không thể kết nối backend AI: ${lastError.message}`
        : "Không thể kết nối backend AI.",
    );
  }

  if (!backendResponse.ok) {
    const detail = await backendResponse.text();
    throw new BackendAgentError(
      detail || `Backend AI trả lời ${backendResponse.status}.`,
      backendResponse.status,
    );
  }

  return parseBackendResponse(backendResponse);
}

export async function callAgentStreamEndpoint({
  baseUrl,
  configuredPath,
  defaultPath,
  body,
}: {
  baseUrl: string;
  configuredPath: string;
  defaultPath: string;
  body: string;
}) {
  const attemptedPaths = Array.from(
    new Set([configuredPath, defaultPath]),
  ).filter(Boolean);

  let backendResponse: Response | null = null;
  let lastError: unknown = null;

  for (const path of attemptedPaths) {
    try {
      const candidate = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body,
        cache: "no-store",
      });

      if (candidate.status === 404 && path !== defaultPath) {
        continue;
      }

      backendResponse = candidate;
      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (!backendResponse) {
    throw new Error(
      lastError instanceof Error
        ? `KhÃ´ng thá»ƒ káº¿t ná»‘i backend AI: ${lastError.message}`
        : "KhÃ´ng thá»ƒ káº¿t ná»‘i backend AI.",
    );
  }

  if (!backendResponse.ok || !backendResponse.body) {
    const detail = await backendResponse.text();
    throw new BackendAgentError(
      detail || `Backend AI tráº£ lá»i ${backendResponse.status}.`,
      backendResponse.status,
    );
  }

  return backendResponse;
}

export class BackendAgentError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "BackendAgentError";
  }
}

async function parseBackendResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

export const agentDefaultPaths = {
  chat: DEFAULT_CHAT_PATH,
  stream: DEFAULT_CHAT_STREAM_PATH,
} as const;

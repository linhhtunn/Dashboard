import {
  BackendAgentError,
  agentDefaultPaths,
  callAgentEndpoint,
  callAgentStreamEndpoint,
  getAgentBaseUrl,
  getAgentPath,
} from "@/lib/ai/agent-backend";
import {
  buildAgentChatBackendBody,
  type AgentChatBackendRequest,
} from "@/lib/ai/agent-chat-request";

export function requireAgentBaseUrl() {
  const baseUrl = getAgentBaseUrl();
  if (!baseUrl) {
    throw new Error("AI_AGENT_BASE_URL chưa được cấu hình.");
  }
  return baseUrl;
}

export async function invokeAgentChat(
  input: Omit<Parameters<typeof buildAgentChatBackendBody>[0], "message"> & {
    message: string;
    authorization?: string | null;
  },
) {
  const baseUrl = requireAgentBaseUrl();
  const body = buildAgentChatBackendBody(input);

  return callAgentEndpoint({
    baseUrl,
    configuredPath: getAgentPath("chat"),
    defaultPath: agentDefaultPaths.chat,
    body: JSON.stringify(body),
    authorization: input.authorization,
  });
}

export async function invokeAgentChatBody(
  body: AgentChatBackendRequest,
  authorization?: string | null,
) {
  const baseUrl = requireAgentBaseUrl();

  return callAgentEndpoint({
    baseUrl,
    configuredPath: getAgentPath("chat"),
    defaultPath: agentDefaultPaths.chat,
    body: JSON.stringify(body),
    authorization,
  });
}

export async function invokeAgentChatStream(
  input: Omit<Parameters<typeof buildAgentChatBackendBody>[0], "message"> & {
    message: string;
    authorization?: string | null;
  },
) {
  const baseUrl = requireAgentBaseUrl();
  const body = buildAgentChatBackendBody(input);

  return callAgentStreamEndpoint({
    baseUrl,
    configuredPath: getAgentPath("stream"),
    defaultPath: agentDefaultPaths.stream,
    body: JSON.stringify(body),
    authorization: input.authorization,
  });
}

export { BackendAgentError };

import {
  BackendAgentError,
  agentDefaultPaths,
  callAgentEndpoint,
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
  },
) {
  const baseUrl = requireAgentBaseUrl();
  const body = buildAgentChatBackendBody(input);

  return callAgentEndpoint({
    baseUrl,
    configuredPath: getAgentPath("chat"),
    defaultPath: agentDefaultPaths.chat,
    body: JSON.stringify(body),
  });
}

export async function invokeAgentChatBody(body: AgentChatBackendRequest) {
  const baseUrl = requireAgentBaseUrl();

  return callAgentEndpoint({
    baseUrl,
    configuredPath: getAgentPath("chat"),
    defaultPath: agentDefaultPaths.chat,
    body: JSON.stringify(body),
  });
}

export { BackendAgentError };

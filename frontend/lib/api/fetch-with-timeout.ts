export const RENDER_REQUEST_TIMEOUT_MS = 2500;
export const MUTATION_REQUEST_TIMEOUT_MS = 8000;

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = RENDER_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  const upstreamSignal = init.signal;
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason);
  const timer = setTimeout(
    () => controller.abort(new Error(`Request timed out after ${timeoutMs}ms.`)),
    timeoutMs,
  );

  if (upstreamSignal?.aborted) {
    abortFromUpstream();
  } else {
    upstreamSignal?.addEventListener("abort", abortFromUpstream, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    upstreamSignal?.removeEventListener("abort", abortFromUpstream);
  }
}

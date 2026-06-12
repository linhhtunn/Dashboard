export async function getApiErrorMessage(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const payload = (await response.json()) as Record<string, unknown>;
      for (const key of ["error", "message", "detail"]) {
        if (typeof payload[key] === "string" && payload[key].trim()) {
          return payload[key].trim();
        }
      }
    } catch {
      // Fall through to the concise status message.
    }
  }

  return `${fallbackMessage} (${response.status})`;
}

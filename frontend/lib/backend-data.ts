const DATA_DEFAULT_PATHS = {
  patients: "/api/patients",
  alerts: "/api/alerts",
  threads: "/api/threads",
} as const;

export function getBackendBaseUrl() {
  return process.env.AI_AGENT_BASE_URL;
}

export function getDataPath(kind: keyof typeof DATA_DEFAULT_PATHS) {
  return DATA_DEFAULT_PATHS[kind];
}

export async function fetchBackendJson<T>({
  baseUrl,
  path,
  searchParams,
}: {
  baseUrl: string;
  path: string;
  searchParams?: URLSearchParams;
}): Promise<T> {
  const search = searchParams && Array.from(searchParams.keys()).length > 0
    ? `?${searchParams.toString()}`
    : "";

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}${search}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Backend data request failed with ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

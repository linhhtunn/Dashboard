import { getApiErrorMessage } from "@/lib/api-response";
import { clinicalApiUrl } from "@/lib/api/config";
import { fetchWithTimeout } from "@/lib/api/fetch-with-timeout";
import { dedupedFetch } from "@/lib/api/request-cache";

type RequestOptions = RequestInit & {
  errorMessage?: string;
};

export async function clinicalApiGet<T>(path: string, options?: RequestOptions): Promise<T> {
  const init = {
    cache: "no-store",
    ...options,
  } satisfies RequestInit;
  const cacheKey = `${path}:${JSON.stringify(init.headers ?? {})}`;

  return dedupedFetch(cacheKey, async () => {
    const response = await fetchWithTimeout(clinicalApiUrl(path), init);
    if (!response.ok) {
      throw new Error(
        await getApiErrorMessage(
          response,
          options?.errorMessage ?? "Unable to load clinical data",
        ),
      );
    }
    return (await response.json()) as T;
  });
}

export async function clinicalApiSend<T>(
  path: string,
  init: RequestInit,
  options?: { errorMessage?: string },
): Promise<T> {
  const response = await fetchWithTimeout(clinicalApiUrl(path), init);
  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        options?.errorMessage ?? "Unable to complete clinical request",
      ),
    );
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

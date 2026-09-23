const REQUEST_TIMEOUT_MS = 10_000;

/**
 * GET a JSON endpoint. Throws a descriptive error on a non-2xx status, and
 * aborts after a timeout so a hung exchange API can't stall a cron run.
 */
export async function fetchJson(url: string, label: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${label} API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

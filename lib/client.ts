// Browser-side helpers. No secrets, no server imports.

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(url: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Couldn't reach Dream Painter. Is the app still running?", 0);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401) {
    // Full reload on purpose: the lock screen must replace all in-memory state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/lock?next=${encodeURIComponent(location.pathname)}`;
    throw new ApiError("Locked", 401);
  }
  if (!res.ok) throw new ApiError(data.error ?? "Something went wrong. Please try again.", res.status);
  return data;
}

export const formatDate = (d: Date | string | number, opts: Intl.DateTimeFormatOptions = { dateStyle: "long" }) =>
  new Intl.DateTimeFormat(undefined, opts).format(new Date(d));

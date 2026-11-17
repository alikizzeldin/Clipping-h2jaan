// Small helpers shared by the dashboard's server functions.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}

/** The request's JSON body, which must be an object. */
export async function readBody(request, limit = 200_000) {
  const text = await request.text();
  if (text.length > limit) throw new HttpError(413, "That is too much data.");
  try {
    const value = JSON.parse(text || "{}");
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
  } catch {
    /* fall through */
  }
  throw new HttpError(400, "The request was not understood.");
}

/** Changes must come from the dashboard's own pages, never from another site. */
export function requireSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
  if (new URL(origin).host !== host) throw new HttpError(403, "This request came from another site.");
}

/** Turn `{ GET, POST, … }` into a function Vercel can serve. */
export function route(handlers) {
  return {
    async fetch(request) {
      try {
        const handler = handlers[request.method];
        if (!handler) return json({ error: "Not supported." }, 405, { allow: Object.keys(handlers).join(", ") });
        if (request.method !== "GET") requireSameOrigin(request);
        return await handler(request);
      } catch (error) {
        if (error instanceof HttpError) return json({ error: error.message }, error.status);
        console.error(error);
        return json({ error: "Something went wrong on the server." }, 500);
      }
    },
  };
}

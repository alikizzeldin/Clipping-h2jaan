// Talking to the dashboard's own server: signing in, and saving what the
// owner chooses. The server keeps it; the agent fetches it before each run.

import type { Overrides, RulesControl } from "./data";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type RunKind = "run" | "test" | "setup";
export type RunRequest = { id: string; kind: RunKind; requested_at: string };
export type Control = { settings: Overrides; rules: RulesControl; request: RunRequest | null; updated_at: string | null };

async function call<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }),
    });
  } catch {
    throw new ApiError(0, "Could not reach the dashboard's server. Check your connection.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, typeof data.error === "string" ? data.error : "The server could not do that.");
  return data as T;
}

export const getSession = () => call<{ signedIn: boolean; ready: boolean; email?: string }>("session");
export const signIn = (email: string, password: string) => call<{ ok: true; email: string }>("login", "POST", { email, password });
export const signOut = () => call<{ ok: true }>("logout", "POST");
export const getControl = () => call<Control>("control");
export const saveSettings = (settings: Overrides) => call<Control>("control", "PUT", { settings });
export const saveRules = (rules: RulesControl) => call<Control>("control", "PUT", { rules });
export const requestRun = (kind: RunKind) => call<Control>("run", "POST", { kind });
export const cancelRun = () => call<Control>("run", "DELETE");

// Talking to GitHub: reading the agent's runs (no key needed) and, with the
// owner's key, saving the control files and starting runs.

import { API, BRANCH, WORKFLOW } from "./config";

const KEY = "gta6fied.owner-key";

export const ownerKey = {
  get: () => {
    try {
      return localStorage.getItem(KEY) ?? "";
    } catch {
      return "";
    }
  },
  set: (value: string) => {
    try {
      if (value) localStorage.setItem(KEY, value.trim());
      else localStorage.removeItem(KEY);
    } catch {
      /* private window: the key just won't be remembered */
    }
  },
};

function headers(key = ownerKey.get()): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(key ? { Authorization: `Bearer ${key}` } : {}),
  };
}

export class GitHubError extends Error {}

async function call(path: string, init: RequestInit = {}, key?: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(key), ...(init.headers ?? {}) } });
  } catch {
    throw new GitHubError("Could not reach GitHub. Check your connection.");
  }
  if (res.status === 401) throw new GitHubError("GitHub did not accept the key. It may be mistyped or expired.");
  if (res.status === 403 || res.status === 404) {
    if (init.method && init.method !== "GET") {
      throw new GitHubError("The key is not allowed to do this. It needs Contents and Actions write access to this repository.");
    }
  }
  return res;
}

/** Check a key before storing it: it must be able to write to the repository. */
export async function verifyKey(key: string): Promise<string> {
  const res = await call("", {}, key);
  if (!res.ok) throw new GitHubError("GitHub did not accept the key for this repository.");
  const body = await res.json();
  if (!body.permissions?.push) throw new GitHubError("The key can read the repository but not write to it.");
  return body.full_name as string;
}

function encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/** Create or replace a JSON file in the repository with one commit. */
export async function saveJson(path: string, value: unknown, message: string): Promise<void> {
  if (!ownerKey.get()) throw new GitHubError("Add your owner key in Settings to save changes.");
  const current = await call(`/contents/${path}?ref=${BRANCH}`);
  const sha = current.ok ? ((await current.json()).sha as string) : undefined;
  const res = await call(`/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      branch: BRANCH,
      content: encode(JSON.stringify(value, null, 1) + "\n"),
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new GitHubError(`GitHub would not save the change${detail.message ? `: ${detail.message}` : "."}`);
  }
}

export type Run = {
  id: number;
  status: string;
  conclusion: string | null;
  event: string;
  created_at: string;
  html_url: string;
};

/** The agent's most recent runs. Works without a key on a public repository. */
export async function recentRuns(): Promise<Run[]> {
  const cached = sessionStorage.getItem("gta6fied.runs");
  if (cached) {
    const { at, runs } = JSON.parse(cached);
    if (Date.now() - at < 3 * 60 * 1000) return runs;
  }
  const res = await call(`/actions/workflows/${WORKFLOW}/runs?per_page=12&branch=${BRANCH}`);
  if (!res.ok) return [];
  const runs = ((await res.json()).workflow_runs ?? []).map((r: Run) => ({
    id: r.id, status: r.status, conclusion: r.conclusion, event: r.event, created_at: r.created_at, html_url: r.html_url,
  }));
  sessionStorage.setItem("gta6fied.runs", JSON.stringify({ at: Date.now(), runs }));
  return runs;
}

/** Start the agent's workflow now. `dry` renders without publishing. */
export async function startRun(inputs: { dry_run?: boolean; check_setup?: boolean }): Promise<void> {
  if (!ownerKey.get()) throw new GitHubError("Add your owner key in Settings to start a run.");
  const res = await call(`/actions/workflows/${WORKFLOW}/dispatches`, {
    method: "POST",
    body: JSON.stringify({
      ref: BRANCH,
      inputs: { dry_run: String(inputs.dry_run ?? false), check_setup: String(inputs.check_setup ?? false) },
    }),
  });
  if (!res.ok) throw new GitHubError("GitHub would not start the run.");
  sessionStorage.removeItem("gta6fied.runs");
}

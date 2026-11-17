// Reading the agent's runs from GitHub. The repository is public, so this
// needs no key.

import { API, BRANCH, WORKFLOW } from "./config";

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
  let res: Response;
  try {
    res = await fetch(`${API}/actions/workflows/${WORKFLOW}/runs?per_page=12&branch=${BRANCH}`, {
      headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    });
  } catch {
    return [];
  }
  if (!res.ok) return [];
  const runs = ((await res.json()).workflow_runs ?? []).map((r: Run) => ({
    id: r.id, status: r.status, conclusion: r.conclusion, event: r.event, created_at: r.created_at, html_url: r.html_url,
  }));
  sessionStorage.setItem("gta6fied.runs", JSON.stringify({ at: Date.now(), runs }));
  return runs;
}

/** Forget the remembered list, so the next look is fresh. */
export function forgetRuns(): void {
  try {
    sessionStorage.removeItem("gta6fied.runs");
  } catch {
    /* nothing remembered */
  }
}

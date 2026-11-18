// Where the agent lives. The Pages build fills these in from the repository
// it runs in; the fallbacks are this project's own.
const repo = (import.meta.env.VITE_REPO as string | undefined) ?? "alikizzeldin/Clipping-h2jaan";
export const BRANCH = (import.meta.env.VITE_BRANCH as string | undefined) ?? "ccr-cceae731-x5d03t";
export const [OWNER, REPO] = repo.split("/");
export const REPO_URL = `https://github.com/${OWNER}/${REPO}`;
export const API = `https://api.github.com/repos/${OWNER}/${REPO}`;
// Dev server reads this checkout's files; the deployed site reads the live repo.
export const FILES = import.meta.env.DEV
  ? "/__repo"
  : `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`;
export const WORKFLOW = "clip.yml";
export const CHANNEL_NAME = "GTA6Fied";
export const YOUTUBE_URL = "https://www.youtube.com/channel/UCY5Lk9NykFVnoUeXMJVH7RA";
export const INSTAGRAM_URL = "https://www.instagram.com/gta6fied/";
export const INSTAGRAM_NAME = "@gta6fied";

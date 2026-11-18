// What the dashboard knows: files the agent keeps in the repository
// (state/…), config.yaml, and the owner's own choices, which the dashboard's
// server stores.

import { parse as parseYaml } from "yaml";
import { getControl, type Control, type RunRequest } from "./api";
import { FILES } from "./config";

export type Clip = {
  id: string;
  video_id: string;
  via: string;
  link: string;
  title: string;
  channel: string;
  category?: string;
  uploaded_at: string;
  status?: "sent" | "error" | string;
  error?: string;
  duration?: number;
  language?: string;
  origin?: "viewer" | "auto";
  burst?: boolean; // part of a one-off launch push, outside the daily plan
  instagram?: string; // Buffer's post id when the clip was also posted to Instagram
  instagram_at?: string;
  instagram_status?: "sent" | "error" | string;
  instagram_link?: string;
  instagram_error?: string;
  views?: number;
  likes?: number;
  comments?: number;
};

export type Activity = {
  time: string;
  type: "published" | "skipped" | "error" | "learned" | "info";
  text: string;
  link?: string;
};

export type RuleKind = "channel" | "duration" | "language" | "keyword";

export type Rule = {
  id: string;
  kind: RuleKind;
  target: string;
  factor: number; // 0 = never use, below 1 = use less, above 1 = prefer
  text?: string;
  note?: string;
  created_at: string;
  evidence?: { clips: number; avg_views: number; baseline: number };
};

export type Learned = { updated_at?: string; measured_clips?: number; needed_clips?: number; rules: Rule[] };
export type RulesControl = { manual: Rule[]; dismissed: string[]; disabled: string[] };
export type HistoryPoint = { date: string; views: number; clips: number };

export type Overrides = Partial<{
  paused: boolean;
  profile: string;
  privacy: "private" | "unlisted" | "public";
  max_per_day: number;
  featured_per_day: number;
  min_gap_hours: number;
  featured_channels: string[];
  block_channels: string[];
  languages: string[];
  min_views: number;
  featured_min_views: number;
  max_duration: number;
  top_channels_only: boolean;
  require_gameplay: boolean;
  english_subtitles: boolean;
  own_clips: boolean;
  caption_glow: number;
  instagram_per_day: number;
}>;

export type Effective = Required<Overrides> & {
  start_at: string;
  game: string;
  instagram_connected: boolean; // an Instagram channel is set in config.yaml
  burst_until: string; // extra batches run until then
  burst_per_run: number;
};

export type Snapshot = {
  demo: boolean;
  clips: Clip[];
  activity: Activity[];
  learned: Learned;
  rules: RulesControl;
  history: HistoryPoint[];
  overrides: Overrides;
  settings: Effective;
  request: RunRequest | null; // a run the owner asked for that has not started yet
  loadedAt: number;
};

const EMPTY_RULES: RulesControl = { manual: [], dismissed: [], disabled: [] };

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${FILES}/${path}?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

async function getText(path: string): Promise<string> {
  try {
    const res = await fetch(`${FILES}/${path}?t=${Math.floor(Date.now() / 60000)}`, { cache: "no-store" });
    return res.ok ? await res.text() : "";
  } catch {
    return "";
  }
}

/** config.yaml with the dashboard's overrides applied: what the agent will use. */
export function effective(configYaml: string, overrides: Overrides): Effective {
  let cfg: any = {};
  try {
    cfg = parseYaml(configYaml) ?? {};
  } catch {
    cfg = {};
  }
  const profileName = overrides.profile ?? cfg.profile ?? "gta6";
  const profile = cfg.profiles?.[profileName] ?? {};
  const theme = cfg.themes?.[profile.theme] ?? {};
  const sel = cfg.selection ?? {};
  const pub = cfg.publish ?? {};
  const cap = cfg.captions ?? {};
  const base: Effective = {
    paused: false,
    profile: profileName,
    game: profile.label ?? "GTA 6",
    privacy: pub.privacy ?? "public",
    max_per_day: pub.max_per_day ?? 3,
    featured_per_day: pub.featured_per_day ?? 2,
    min_gap_hours: pub.min_gap_hours ?? 7,
    featured_channels: sel.featured_channels ?? [],
    block_channels: sel.block_channels ?? [],
    languages: sel.languages ?? [],
    min_views: profile.min_views ?? 150,
    featured_min_views: sel.featured_min_views ?? 20,
    max_duration: sel.max_duration ?? 120,
    top_channels_only: sel.top_channels_only ?? true,
    require_gameplay: sel.require_gameplay ?? true,
    english_subtitles: cap.english_subtitles ?? true,
    own_clips: sel.own_clips ?? false,
    caption_glow: theme.caption_glow ?? 0.3,
    instagram_per_day: pub.instagram_per_day ?? 3,
    start_at: pub.start_at ?? "",
    instagram_connected: Boolean(pub.instagram_channel_id),
    burst_until: pub.burst_until ?? "",
    burst_per_run: pub.burst_per_run ?? 8,
  };
  return {
    ...base, ...overrides,
    game: base.game, start_at: base.start_at, instagram_connected: base.instagram_connected,
    burst_until: base.burst_until, burst_per_run: base.burst_per_run,
  } as Effective;
}

export async function loadSnapshot(demo: boolean): Promise<Snapshot> {
  if (demo) return demoSnapshot();
  const noControl: Control = { settings: {}, rules: EMPTY_RULES, request: null, updated_at: null };
  const [state, activity, learned, history, control, yaml] = await Promise.all([
    getJson<{ published?: Record<string, Omit<Clip, "id">> }>("state/published.json", {}),
    getJson<Activity[]>("state/activity.json", []),
    getJson<Learned>("state/learned.json", { rules: [] }),
    getJson<HistoryPoint[]>("state/history.json", []),
    getControl().catch(() => noControl),
    getText("config.yaml"),
  ]);
  const rules = control.rules;
  const overrides = control.settings;
  const clips = Object.entries(state.published ?? {})
    .map(([id, c]) => ({ id, ...c }))
    .sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at));
  return {
    demo: false,
    clips,
    activity: Array.isArray(activity) ? activity : [],
    learned: { ...learned, rules: learned.rules ?? [] },
    rules: { ...EMPTY_RULES, ...rules },
    history: Array.isArray(history) ? history : [],
    overrides,
    settings: effective(yaml, overrides),
    request: control.request,
    loadedAt: Date.now(),
  };
}

// ---------------------------------------------------------------- insights

export type Group = { key: string; clips: number; views: number; avg: number };

function group(clips: Clip[], keyOf: (c: Clip) => string | undefined): Group[] {
  const map = new Map<string, { clips: number; views: number }>();
  for (const c of clips) {
    const key = keyOf(c);
    if (!key) continue;
    const g = map.get(key) ?? { clips: 0, views: 0 };
    g.clips += 1;
    g.views += c.views ?? 0;
    map.set(key, g);
  }
  return [...map.entries()]
    .map(([key, g]) => ({ key, ...g, avg: g.clips ? g.views / g.clips : 0 }))
    .sort((a, b) => b.views - a.views);
}

export function lengthBucket(seconds?: number): string | undefined {
  if (!seconds) return undefined;
  if (seconds < 30) return "Under 30s";
  if (seconds < 60) return "30–60s";
  return "Over 60s";
}

export function insights(snap: Snapshot) {
  const live = snap.clips.filter((c) => c.status !== "error");
  const totalViews = live.reduce((sum, c) => sum + (c.views ?? 0), 0);
  const measured = live.filter((c) => c.views !== undefined);
  const dayAgo = Date.now() - 24 * 3600 * 1000;
  const recent = live.filter((c) => new Date(c.uploaded_at).getTime() >= dayAgo);
  // The daily plan (and its spacing) counts only regular posts; a launch burst is extra.
  const today = recent.filter((c) => !c.burst);
  const featured = new Set(snap.settings.featured_channels.map((c) => c.toLowerCase()));
  const top = [...measured].sort((a, b) => (b.views ?? 0) - (a.views ?? 0))[0];
  const regular = live.filter((c) => !c.burst);
  const lastUpload = regular[0] ? new Date(regular[0].uploaded_at).getTime() : 0;
  const nextSlot = lastUpload ? lastUpload + snap.settings.min_gap_hours * 3600 * 1000 : 0;
  return {
    totalViews,
    totalClips: live.length,
    measuredClips: measured.length,
    avgViews: measured.length ? totalViews / measured.length : 0,
    failed: snap.clips.filter((c) => c.status === "error").length,
    today: today.length,
    todayBurst: recent.length - today.length,
    instagramToday: live.filter((c) => c.instagram && c.instagram_at && new Date(c.instagram_at).getTime() >= dayAgo).length,
    instagramTotal: live.filter((c) => c.instagram).length,
    todayFeatured: today.filter((c) => featured.has(c.channel.toLowerCase())).length,
    todayByChannel: today.reduce<Record<string, number>>((all, c) => {
      const key = c.channel.toLowerCase();
      all[key] = (all[key] ?? 0) + 1;
      return all;
    }, {}),
    featuredShare: live.filter((c) => featured.has(c.channel.toLowerCase())).length,
    top,
    nextSlot,
    byChannel: group(measured, (c) => c.channel),
    byLength: group(measured, (c) => lengthBucket(c.duration)),
    byLanguage: group(measured, (c) => c.language || undefined),
    byOrigin: group(measured, (c) => (c.origin === "auto" ? "Cut by the agent" : "Viewer clips")),
  };
}

export function ruleSentence(rule: Rule): string {
  if (rule.text) return rule.text;
  const how = rule.factor === 0 ? "Never use" : rule.factor < 1 ? "Use fewer" : rule.factor >= 2 ? "Strongly prefer" : "Prefer";
  switch (rule.kind) {
    case "channel":
      return `${how} clips from ${rule.target}`;
    case "duration":
      return `${how} clips that are ${rule.target.toLowerCase()}`;
    case "language":
      return `${how} clips in ${rule.target}`;
    case "keyword":
      return `${how} clips that mention “${rule.target}”`;
  }
}

// -------------------------------------------------------------- demo data
// Only used when the visitor switches on "demo mode", to preview the design
// before real clips exist. It is always labelled as demo on screen.

function demoSnapshot(): Snapshot {
  const now = Date.now();
  const hour = 3600 * 1000;
  const channels = ["sxb", "sxb", "xqc", "sxb", "adinross", "sxb", "westcol", "sxb", "trainwreckstv", "sxb", "sxb", "xqc"];
  const titles = [
    "First 10 minutes in Vice City", "SXB يدخل ليونيدا لأول مرة", "This heist went completely wrong",
    "أقوى مطاردة شرطة", "He found the secret garage", "ردة فعل SXB على الخريطة", "Jet ski escape",
    "SXB vs five stars", "The most expensive car in the game", "أول مهمة في اللعبة", "لقطة لا تصدق", "Flying under the bridge",
  ];
  const clips: Clip[] = titles.map((title, i) => {
    const channel = channels[i];
    const durationS = [24, 48, 37, 71, 29, 55, 33, 92, 41, 26, 63, 38][i];
    const views = Math.round((channel === "sxb" ? 260000 : 140000) * (1.6 - i * 0.09) * (durationS < 45 ? 1.4 : 0.8));
    return {
      id: `demo_${i}`, video_id: `demo_${i}`, via: "buffer", link: "", title, channel,
      category: "grand-theft-auto-vi", uploaded_at: new Date(now - (i * 8 + 3) * hour).toISOString(),
      status: i === 7 ? "error" : "sent", error: i === 7 ? "YouTube rejected the upload" : undefined,
      duration: durationS, language: channel === "sxb" ? "Arabic" : "English",
      origin: i % 5 === 1 ? "auto" : "viewer", views: i === 0 ? undefined : views,
      likes: Math.round(views * 0.06), comments: Math.round(views * 0.004),
      ...(i < 5 && i !== 3 ? { instagram: `demo_ig_${i}`, instagram_at: new Date(now - (i * 8 + 3) * hour).toISOString() } : {}),
    };
  });
  const history: HistoryPoint[] = Array.from({ length: 14 }, (_, i) => ({
    date: new Date(now - (13 - i) * 24 * hour).toISOString().slice(0, 10),
    views: Math.round(40000 * Math.pow(1.42, i) + 90000 * Math.sin(i / 2) ** 2),
    clips: Math.min(36, 3 * (i + 1)),
  }));
  const learned: Learned = {
    updated_at: new Date(now - 5 * hour).toISOString(), measured_clips: 11, needed_clips: 8,
    rules: [
      { id: "auto-channel-sxb", kind: "channel", target: "sxb", factor: 1.5, created_at: new Date(now - 30 * hour).toISOString(),
        text: "Clips from sxb usually get more views than the rest", evidence: { clips: 6, avg_views: 291000, baseline: 168000 } },
      { id: "auto-duration-under-30s", kind: "duration", target: "Under 30s", factor: 1.3, created_at: new Date(now - 30 * hour).toISOString(),
        text: "Clips under 30 seconds usually get more views", evidence: { clips: 3, avg_views: 322000, baseline: 205000 } },
      { id: "auto-duration-over-60s", kind: "duration", target: "Over 60s", factor: 0.7, created_at: new Date(now - 6 * hour).toISOString(),
        text: "Clips over a minute usually get fewer views", evidence: { clips: 3, avg_views: 96000, baseline: 205000 } },
    ],
  };
  const rules: RulesControl = {
    manual: [{ id: "manual-1", kind: "keyword", target: "police", factor: 1.5, note: "Chases do well", created_at: new Date(now - 50 * hour).toISOString() }],
    dismissed: [], disabled: ["auto-duration-over-60s"],
  };
  const activity: Activity[] = [
    { time: new Date(now - 3 * hour).toISOString(), type: "published", text: "Published “First 10 minutes in Vice City” from sxb" },
    { time: new Date(now - 5 * hour).toISOString(), type: "learned", text: "Learned: clips under 30 seconds get more views" },
    { time: new Date(now - 5.2 * hour).toISOString(), type: "skipped", text: "Skipped a clip from westcol: no game on screen" },
    { time: new Date(now - 11 * hour).toISOString(), type: "published", text: "Published “SXB يدخل ليونيدا لأول مرة” (cut by the agent)" },
    { time: new Date(now - 13 * hour).toISOString(), type: "skipped", text: "Skipped a clip from xqc: same moment already posted" },
    { time: new Date(now - 59 * hour).toISOString(), type: "error", text: "Buffer could not publish “SXB vs five stars”" },
  ];
  const overrides: Overrides = {};
  const settings = effective("", overrides);
  settings.featured_channels = ["sxb"];
  settings.start_at = new Date(now - 14 * 24 * hour).toISOString();
  return { demo: true, clips, activity, learned, rules, history, overrides, settings, request: null, loadedAt: now };
}

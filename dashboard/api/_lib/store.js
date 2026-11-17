// What the owner has chosen on the dashboard: settings, learning rules and
// a pending "run now" request. One small JSON document, kept in the
// project's private Vercel Blob store (or a local file while developing).

import fs from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";
import { HttpError } from "./http.js";

const NAME = "control.json";

// The settings the dashboard may change. The agent checks every value again.
const SETTINGS = new Set([
  "paused", "privacy", "max_per_day", "featured_per_day", "min_gap_hours", "featured_channels", "block_channels",
  "languages", "min_views", "featured_min_views", "max_duration", "top_channels_only", "require_gameplay",
  "english_subtitles", "own_clips", "caption_glow",
]);
const RULE_KINDS = new Set(["channel", "duration", "language", "keyword"]);
export const RUN_KINDS = new Set(["run", "test", "setup"]);

const empty = () => ({ settings: {}, rules: { manual: [], dismissed: [], disabled: [] }, request: null, updated_at: null });

const text = (value, max) => (typeof value === "string" ? value.slice(0, max) : "");
const ids = (value) => (Array.isArray(value) ? [...new Set(value.filter((v) => typeof v === "string").map((v) => v.slice(0, 120)))].slice(0, 500) : []);

export function cleanSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Settings must be a list of named values.");
  const out = {};
  for (const [name, raw] of Object.entries(value)) {
    if (!SETTINGS.has(name)) continue;
    if (typeof raw === "boolean" || (typeof raw === "number" && Number.isFinite(raw))) out[name] = raw;
    else if (typeof raw === "string") out[name] = raw.slice(0, 40);
    else if (Array.isArray(raw)) out[name] = raw.filter((v) => typeof v === "string").map((v) => v.trim().toLowerCase().slice(0, 60)).filter(Boolean).slice(0, 100);
  }
  return out;
}

export function cleanRules(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Rules must be a list of named values.");
  const manual = (Array.isArray(value.manual) ? value.manual : [])
    .filter((r) => r && typeof r === "object" && RULE_KINDS.has(r.kind) && typeof r.factor === "number" && Number.isFinite(r.factor) && text(r.target, 80).trim())
    .slice(0, 200)
    .map((r) => ({
      id: text(r.id, 60) || `manual-${Date.now()}`,
      kind: r.kind,
      target: text(r.target, 80).trim(),
      factor: Math.min(5, Math.max(0, r.factor)),
      ...(text(r.note, 200).trim() ? { note: text(r.note, 200).trim() } : {}),
      created_at: text(r.created_at, 40) || new Date().toISOString(),
    }));
  return { manual, dismissed: ids(value.dismissed), disabled: ids(value.disabled) };
}

function normalise(doc) {
  const base = empty();
  if (!doc || typeof doc !== "object") return base;
  const request = doc.request && RUN_KINDS.has(doc.request.kind) && typeof doc.request.requested_at === "string"
    ? { id: text(doc.request.id, 40), kind: doc.request.kind, requested_at: doc.request.requested_at }
    : null;
  return {
    settings: doc.settings && typeof doc.settings === "object" ? cleanSettings(doc.settings) : base.settings,
    rules: doc.rules && typeof doc.rules === "object" ? cleanRules(doc.rules) : base.rules,
    request,
    updated_at: typeof doc.updated_at === "string" ? doc.updated_at : null,
  };
}

// Storage: the project's private Vercel Blob store, or, while developing,
// files next to CONTROL_FILE.
const localFile = (name) => (process.env.CONTROL_FILE ? path.join(path.dirname(process.env.CONTROL_FILE), name) : "");

/** A stored JSON document, or null when there is none yet. */
export async function readJson(name) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // useCache: false reads the stored copy itself, so a change shows at once.
    const found = await get(name, { access: "private", useCache: false });
    if (!found || found.statusCode !== 200) return null;
    return await new Response(found.stream).json();
  }
  if (localFile(name)) {
    try {
      return JSON.parse(await fs.readFile(localFile(name), "utf8"));
    } catch {
      return null;
    }
  }
  throw new HttpError(503, "The dashboard's storage is not connected.");
}

export async function writeJson(name, value) {
  const body = JSON.stringify(value, null, 1);
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(name, body, { access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json" });
  } else if (localFile(name)) {
    await fs.mkdir(path.dirname(localFile(name)), { recursive: true });
    await fs.writeFile(localFile(name), body);
  } else {
    throw new HttpError(503, "The dashboard's storage is not connected.");
  }
}

export async function readControl() {
  return normalise(await readJson(NAME));
}

export async function writeControl(doc) {
  const next = { ...normalise(doc), updated_at: new Date().toISOString() };
  await writeJson(NAME, next);
  return next;
}

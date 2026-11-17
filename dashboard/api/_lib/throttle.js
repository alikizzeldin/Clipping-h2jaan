// Slows down password guessing: after a few wrong tries from one address,
// or many from anywhere, signing in is refused for a while. Addresses are
// stored only as salted hashes.

import { createHash } from "node:crypto";
import { readJson, writeJson } from "./store.js";

const NAME = "attempts.json";
const WINDOW = 15 * 60 * 1000;
const PER_ADDRESS = 8;
const OVERALL = 40;

function addressKey(request) {
  const address = request.headers.get("x-real-ip") ?? (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return createHash("sha256").update(`${process.env.SESSION_SECRET}|${address || "unknown"}`).digest("base64url").slice(0, 16);
}

const live = (entry, now) => (entry && typeof entry.n === "number" && now - entry.since < WINDOW ? entry : null);

/**
 * Look at the record of wrong tries before checking a password.
 * `blocked` says whether to refuse; call `failed()` or `passed()` afterwards.
 * If the record cannot be read, signing in still works (only without this limit).
 */
export async function openGate(request) {
  const now = Date.now();
  const key = addressKey(request);
  let doc = null;
  try {
    doc = await readJson(NAME);
  } catch (error) {
    console.error("could not read the sign-in record", error);
  }
  const addresses = {};
  for (const [name, entry] of Object.entries(doc?.addresses ?? {})) if (live(entry, now)) addresses[name] = entry;
  const overall = live(doc?.overall, now) ?? { n: 0, since: now };
  const mine = addresses[key] ?? { n: 0, since: now };
  const save = async (next) => {
    try {
      await writeJson(NAME, next);
    } catch (error) {
      console.error("could not save the sign-in record", error);
    }
  };
  return {
    blocked: mine.n >= PER_ADDRESS || overall.n >= OVERALL,
    async failed() {
      const kept = Object.fromEntries(Object.entries({ ...addresses, [key]: { n: mine.n + 1, since: mine.since } }).slice(-300));
      await save({ addresses: kept, overall: { n: overall.n + 1, since: overall.since } });
    },
    async passed() {
      if (!addresses[key]) return;
      delete addresses[key];
      await save({ addresses, overall });
    },
  };
}

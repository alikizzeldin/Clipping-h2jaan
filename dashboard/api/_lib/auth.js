// Signing in. The owner's email and a salted hash of the password live in
// the hosting provider's settings, never in this (public) repository:
//   ADMIN_EMAIL, ADMIN_PASSWORD_HASH, SESSION_SECRET

import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";

const COOKIE = "g6_session";
const MONTH = 60 * 60 * 24 * 30;

export function configured() {
  return Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH && process.env.SESSION_SECRET);
}

export function ownerEmail() {
  return process.env.ADMIN_EMAIL ?? "";
}

/** A salted scrypt hash, in the form kept in ADMIN_PASSWORD_HASH. */
export function hashPassword(password, salt = randomBytes(16)) {
  const hash = scryptSync(String(password).normalize("NFKC"), salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:16384:8:1:${salt.toString("base64url")}:${hash.toString("base64url")}`;
}

function sameText(a, b) {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export function checkLogin(email, password) {
  const [scheme, n, r, p, salt, want] = (process.env.ADMIN_PASSWORD_HASH ?? "").split(":");
  if (scheme !== "scrypt" || !salt || !want) return false;
  const expected = Buffer.from(want, "base64url");
  const got = scryptSync(String(password).normalize("NFKC"), Buffer.from(salt, "base64url"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p),
  });
  // Both checks always run, so a wrong email takes as long as a wrong password.
  const passwordOk = timingSafeEqual(got, expected);
  const emailOk = sameText(String(email).trim().toLowerCase(), ownerEmail().trim().toLowerCase());
  return passwordOk && emailOk;
}

// Changing the password also ends every session signed with the old one.
function key() {
  return createHash("sha256").update(`${process.env.SESSION_SECRET}|${process.env.ADMIN_PASSWORD_HASH}`).digest();
}

function sign(payload) {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

export function newSession() {
  const payload = `v1.${Math.floor(Date.now() / 1000) + MONTH}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function signedIn(request) {
  if (!configured()) return false;
  const match = (request.headers.get("cookie") ?? "").match(/(?:^|;\s*)g6_session=([^;]+)/);
  if (!match) return false;
  const token = match[1];
  const cut = token.lastIndexOf(".");
  if (cut < 0) return false;
  const payload = token.slice(0, cut);
  if (!sameText(token.slice(cut + 1), sign(payload))) return false;
  const expires = Number(payload.split(".")[1]);
  return Number.isFinite(expires) && expires > Date.now() / 1000;
}

export function requireOwner(request) {
  if (!signedIn(request)) throw new HttpError(401, "Please sign in again.");
}

/** The Set-Cookie value that starts (or, with an empty value, ends) a session. */
export function sessionCookie(request, value) {
  const https = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${value ? MONTH : 0}${https ? "; Secure" : ""}`;
}

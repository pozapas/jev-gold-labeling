/** Access-code gate.
 *
 * The narratives are not public data, so the dataset is NOT served from public/. It lives in
 * data/ (server-side only) and is handed out by /api/tasks, which refuses without a valid
 * cookie. The cookie is set by /api/gate after checking the submitted code.
 *
 * The code itself is never stored here -- only a salted SHA-256 of it. The code is 12
 * characters from a 32-symbol alphabet (~2^60), so recovering it from the hash is not
 * feasible, and the repository therefore contains no secret. Setting ACCESS_CODE in the
 * environment overrides the baked hash, which is how the code is rotated without a commit.
 *
 * This is a shared secret, not per-user authentication: it stops the link being usable by
 * whoever finds it, which is what it is for. It does not stop a coder passing the code on,
 * and it is not a substitute for the data agreement.
 */
import { createHash, createHmac, timingSafeEqual } from "crypto";

const COOKIE = "jev_gate";
const SALT = "jev-gold-2026";

/** sha256(`${SALT}:${CODE.toUpperCase()}`) — see scripts/set-code.mjs to rotate. */
const CODE_HASH = "10b2da91708242fcc971834c0466c27cbc712fd3362201aeb75cef2d00644ecb";

function hashOf(code: string): string {
  return createHash("sha256").update(`${SALT}:${code.trim().toUpperCase()}`).digest("hex");
}

function expectedHash(): string {
  const env = process.env.ACCESS_CODE;
  return env && env.length > 0 ? hashOf(env) : CODE_HASH;
}

function secret(): string {
  // Binds issued cookies to the active code: rotating the code invalidates every cookie.
  return process.env.SESSION_SECRET || expectedHash();
}

export function gateConfigured(): boolean {
  return expectedHash().length === 64;
}

/** Constant-time compare of the hashes, so the endpoint leaks nothing by timing. */
export function codeMatches(given: string): boolean {
  if (!given) return false;
  const a = Buffer.from(hashOf(given));
  const b = Buffer.from(expectedHash());
  return a.length === b.length && timingSafeEqual(a, b);
}

export function issueToken(): string {
  const day = Math.floor(Date.now() / 86_400_000);
  const mac = createHmac("sha256", secret()).update(`v1:${day}`).digest("base64url");
  return `${day}.${mac}`;
}

/** Valid for the issuing day and the 13 after it, so a coder is not logged out mid-session
 *  but a leaked cookie does not last forever. */
export function tokenValid(token: string | undefined): boolean {
  if (!token) return false;
  const [dayStr, mac] = token.split(".");
  const day = Number(dayStr);
  if (!Number.isFinite(day) || !mac) return false;
  const today = Math.floor(Date.now() / 86_400_000);
  if (today - day > 13 || day > today) return false;
  const want = createHmac("sha256", secret()).update(`v1:${day}`).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const COOKIE_NAME = COOKIE;

/** Access-code gate.
 *
 * The narratives are not public data, so the dataset is NOT served from public/. It lives in
 * data/ (server-side only) and is handed out by /api/tasks, which refuses without a valid
 * cookie. The cookie is set by /api/gate after checking the code against ACCESS_CODE.
 *
 * This is a shared-secret gate, not per-user authentication: it stops the link from being
 * openable by anyone who finds it, which is what was asked for. It does not stop a coder who
 * has the code from sharing it, and it is not a substitute for the data agreement.
 */
import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "jev_gate";

function secret(): string {
  // SESSION_SECRET is optional; falling back to the code itself still binds the cookie to
  // the configured code, so rotating the code invalidates every issued cookie.
  return process.env.SESSION_SECRET || process.env.ACCESS_CODE || "dev-only-secret";
}

export function expectedCode(): string | null {
  const c = process.env.ACCESS_CODE;
  return c && c.length > 0 ? c : null;
}

/** Constant-time compare, so the endpoint does not leak the code one character at a time. */
export function codeMatches(given: string): boolean {
  const want = expectedCode();
  if (!want) return false;
  const a = Buffer.from(given.trim());
  const b = Buffer.from(want);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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

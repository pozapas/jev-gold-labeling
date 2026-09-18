import { NextResponse } from "next/server";
import { COOKIE_NAME, codeMatches, gateConfigured, issueToken } from "@/lib/gate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!gateConfigured()) {
    // Fail closed: a missing code configuration must never mean "open to everyone".
    return NextResponse.json({ error: "gate is not configured" }, { status: 503 });
  }
  let code = "";
  try {
    code = String(((await req.json()) as { code?: string }).code ?? "");
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (!codeMatches(code)) {
    // A small delay blunts online guessing without needing a rate-limit store.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "That code is not right." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, issueToken(), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
    path: "/", maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}

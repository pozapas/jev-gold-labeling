import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile } from "fs/promises";
import path from "path";
import { COOKIE_NAME, tokenValid } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Roster only — the entry page needs the name list before any narrative is shown. */
export async function GET() {
  const jar = await cookies();
  if (!tokenValid(jar.get(COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const body = await readFile(path.join(process.cwd(), "data", "roster.json"), "utf8");
  return new NextResponse(body, {
    headers: { "content-type": "application/json", "cache-control": "private, no-store" },
  });
}

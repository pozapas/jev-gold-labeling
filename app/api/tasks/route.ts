import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readFile } from "fs/promises";
import { gunzipSync } from "zlib";
import path from "path";
import { COOKIE_NAME, tokenValid } from "@/lib/gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The dataset lives outside public/, so this is the only route to the narratives and every
 *  request must carry a valid gate cookie. Stored gzipped (260 KB -> 77 KB). The roster is
 *  returned alongside it so the client can work out which slice this rater owns. */
export async function GET() {
  const jar = await cookies();
  if (!tokenValid(jar.get(COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const dir = path.join(process.cwd(), "data");
  let tasks: string;
  try {
    tasks = gunzipSync(await readFile(path.join(dir, "gold_tasks.json.gz"))).toString("utf8");
  } catch {
    tasks = await readFile(path.join(dir, "gold_tasks.json"), "utf8");
  }
  const roster = await readFile(path.join(dir, "roster.json"), "utf8");
  const body = `{"dataset":${tasks},"roster":${roster}}`;
  return new NextResponse(body, {
    headers: { "content-type": "application/json", "cache-control": "private, no-store" },
  });
}

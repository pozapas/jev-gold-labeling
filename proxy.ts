import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, tokenValid } from "@/lib/gate";

/**
 * Access gate. `proxy.ts` replaces `middleware.ts` in Next 16 and defaults to the Node.js
 * runtime, so the HMAC check can use node:crypto here.
 *
 * Per the Next docs, a proxy matcher is not an authorisation boundary on its own: a matcher
 * change can silently drop coverage. /api/tasks therefore re-checks the same cookie itself,
 * and the dataset lives outside public/ so it has no unguarded path at all. This redirect is
 * for humans landing on a page, not the thing protecting the data.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/gate") || pathname.startsWith("/api/gate")) {
    return NextResponse.next();
  }
  if (tokenValid(req.cookies.get(COOKIE_NAME)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.search =
    pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse, type NextRequest } from "next/server";
import { isLang, LANG_COOKIE, negotiateLang } from "./lib/i18n";

const IGNORED_SEGMENTS = new Set(["_next", "api", "icon", "apple-icon", "favicon"]);

/**
 * Redirect bare `/` and legacy single-segment `/<slug>` requests to the reader's
 * negotiated language prefix (`/en/...` or `/zh/...`), preserving shared links.
 */
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const trimmed = pathname.replace(/^\/+|\/+$/g, "");

    if (pathname !== "/") {
        if (
            !trimmed ||
            trimmed.includes("/") ||
            trimmed.includes(".") ||
            isLang(trimmed) ||
            IGNORED_SEGMENTS.has(trimmed)
        ) {
            return NextResponse.next();
        }
    }

    const lang = negotiateLang(
        request.cookies.get(LANG_COOKIE)?.value,
        request.headers.get("accept-language")
    );

    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? `/${lang}` : `/${lang}/${trimmed}`;
    return NextResponse.redirect(url, 307);
}

export const config = {
    matcher: ["/", "/:slug"],
};

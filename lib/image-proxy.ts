import { signedS3Url } from "./post-utils.ts";

// Notion's signed S3 URLs expire after 1 hour; cache redirects for 30 minutes
// so any cached 302 Location remains valid.
export const FILE_CACHE_CONTROL = "public, max-age=1800, s-maxage=1800";
export const EXTERNAL_CACHE_CONTROL = "public, max-age=86400, s-maxage=86400";
export const ERROR_CACHE_CONTROL = "no-store";

const HEX_32_RE = /^[0-9a-fA-F]{32}$/;
const UUID_36_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Validate a Notion block ID (32 hex chars or 36-char dashed UUID) and return
 * the lowercase dashed UUID, or null if invalid.
 */
export const normalizeNotionBlockId = (raw: string): string | null => {
    if (!HEX_32_RE.test(raw) && !UUID_36_RE.test(raw)) {
        return null;
    }
    const clean = raw.replace(/-/g, "").toLowerCase();
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
};

export type ImageBlockResolution =
    | { ok: true; status: 302; location: string; cacheControl: string }
    | { ok: false; status: 404 | 502; cacheControl: string };

interface NotionImageBlockShape {
    type?: unknown;
    image?: {
        type?: unknown;
        file?: { url?: unknown };
        external?: { url?: unknown };
    };
}

/**
 * Resolve a retrieved Notion block into either a 302 redirect target with
 * Cache-Control headers, or a 404 when the block is not an image.
 */
export const resolveImageBlock = (block: unknown): ImageBlockResolution => {
    if (!block || typeof block !== "object") {
        return { ok: false, status: 404, cacheControl: ERROR_CACHE_CONTROL };
    }
    const { type, image } = block as NotionImageBlockShape;
    if (type !== "image" || !image || typeof image !== "object") {
        return { ok: false, status: 404, cacheControl: ERROR_CACHE_CONTROL };
    }
    if (image.type === "file" && typeof image.file?.url === "string" && image.file.url) {
        return {
            ok: true,
            status: 302,
            location: image.file.url,
            cacheControl: FILE_CACHE_CONTROL,
        };
    }
    if (image.type === "external" && typeof image.external?.url === "string" && image.external.url) {
        return {
            ok: true,
            status: 302,
            location: image.external.url,
            cacheControl: EXTERNAL_CACHE_CONTROL,
        };
    }
    return { ok: false, status: 404, cacheControl: ERROR_CACHE_CONTROL };
};

/**
 * Map a Notion client error to an HTTP status and uncached Cache-Control header.
 */
export const statusForNotionError = (
    error: unknown
): { status: 404 | 502; cacheControl: string } => {
    const code = error && typeof error === "object" ? (error as { code?: unknown }).code : undefined;
    if (code === "object_not_found") {
        return { status: 404, cacheControl: ERROR_CACHE_CONTROL };
    }
    return { status: 502, cacheControl: ERROR_CACHE_CONTROL };
};

/**
 * Return true if the URL points to a Notion-hosted file whose signed URL expires
 * or requires proxying through `/api/notion-image/<blockId>`.
 */
export const isNotionHostedImageUrl = (url: string): boolean => {
    if (signedS3Url(url) !== null) return true;
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return false;
    }
    const { hostname } = parsed;
    if (hostname === "file.notion.so") return true;
    if (hostname === "notion-static.com" || hostname.endsWith(".notion-static.com")) return true;
    if (hostname.startsWith("prod-files-secure.s3.") && hostname.endsWith(".amazonaws.com")) {
        return true;
    }
    return false;
};

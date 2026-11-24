import type { NextRequest } from "next/server";
import {
    ERROR_CACHE_CONTROL,
    normalizeNotionBlockId,
    resolveImageBlock,
    statusForNotionError,
} from "../../../../lib/image-proxy";
import { notion } from "../../../../lib/notion";

/**
 * Resolve a Notion image block to a fresh signed URL at request time so ISR-cached
 * post HTML never embeds expiring S3 signatures.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ blockId: string }> }
) {
    const { blockId } = await params;
    const normalizedId = normalizeNotionBlockId(blockId);
    if (!normalizedId) {
        return new Response("Invalid block ID", {
            status: 400,
            headers: { "Cache-Control": ERROR_CACHE_CONTROL },
        });
    }

    let block: unknown;
    try {
        block = await notion.blocks.retrieve({ block_id: normalizedId });
    } catch (error) {
        const { status, cacheControl } = statusForNotionError(error);
        return new Response(status === 404 ? "Image not found" : "Upstream error", {
            status,
            headers: { "Cache-Control": cacheControl },
        });
    }

    const resolved = resolveImageBlock(block);
    if (!resolved.ok) {
        return new Response("Image not found", {
            status: resolved.status,
            headers: { "Cache-Control": resolved.cacheControl },
        });
    }

    return new Response(null, {
        status: resolved.status,
        headers: {
            Location: resolved.location,
            "Cache-Control": resolved.cacheControl,
        },
    });
}

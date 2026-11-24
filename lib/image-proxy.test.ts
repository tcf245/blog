// Run: npm test  (node --test with built-in TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    ERROR_CACHE_CONTROL,
    EXTERNAL_CACHE_CONTROL,
    FILE_CACHE_CONTROL,
    normalizeNotionBlockId,
    resolveImageBlock,
    statusForNotionError,
} from "./image-proxy.ts";
import { mapImageUrl } from "./image-url.ts";

// Feedback FB-064: images broke after ISR served HTML with expired signed URLs
test("resolveImageBlock maps Notion file, external, and non-image blocks", () => {
    const fileUrl = "https://prod-files-secure.s3.us-west-2.amazonaws.com/space/file/img.png?X-Amz-Signature=abc";
    assert.deepEqual(
        resolveImageBlock({
            type: "image",
            image: { type: "file", file: { url: fileUrl } },
        }),
        {
            ok: true,
            status: 302,
            location: fileUrl,
            cacheControl: FILE_CACHE_CONTROL,
        }
    );

    const extUrl = "https://example.com/photo.png";
    assert.deepEqual(
        resolveImageBlock({
            type: "image",
            image: { type: "external", external: { url: extUrl } },
        }),
        {
            ok: true,
            status: 302,
            location: extUrl,
            cacheControl: EXTERNAL_CACHE_CONTROL,
        }
    );

    assert.deepEqual(
        resolveImageBlock({ type: "paragraph", paragraph: { rich_text: [] } }),
        { ok: false, status: 404, cacheControl: ERROR_CACHE_CONTROL }
    );
    assert.deepEqual(
        resolveImageBlock({ type: "image", image: { type: "file", file: {} } }),
        { ok: false, status: 404, cacheControl: ERROR_CACHE_CONTROL }
    );
    assert.deepEqual(
        resolveImageBlock(null),
        { ok: false, status: 404, cacheControl: ERROR_CACHE_CONTROL }
    );
});

test("normalizeNotionBlockId validates 32-hex and dashed UUIDs", () => {
    const expected = "12345678-90ab-cdef-1234-567890abcdef";
    assert.equal(normalizeNotionBlockId("1234567890abcdef1234567890abcdef"), expected);
    assert.equal(normalizeNotionBlockId("12345678-90AB-CDEF-1234-567890ABCDEF"), expected);
    assert.equal(normalizeNotionBlockId("12345678-90ab-cdef-1234-567890abcdef"), expected);

    assert.equal(normalizeNotionBlockId(""), null);
    assert.equal(normalizeNotionBlockId("1234"), null);
    assert.equal(normalizeNotionBlockId("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"), null);
    assert.equal(normalizeNotionBlockId("12345678-90ab-cdef-12345-67890abcdef"), null);
});

test("statusForNotionError maps object_not_found to 404 and others to 502 with no-store", () => {
    assert.deepEqual(
        statusForNotionError({ code: "object_not_found" }),
        { status: 404, cacheControl: ERROR_CACHE_CONTROL }
    );
    assert.deepEqual(
        statusForNotionError({ code: "internal_server_error" }),
        { status: 502, cacheControl: ERROR_CACHE_CONTROL }
    );
    assert.deepEqual(
        statusForNotionError(new Error("network failure")),
        { status: 502, cacheControl: ERROR_CACHE_CONTROL }
    );
});

test("mapImageUrl proxies Notion-hosted images and preserves external URLs", () => {
    const block = { id: "12345678-90ab-cdef-1234-567890abcdef", parent_table: "block" } as never;
    const signedS3 = "https://prod-files-secure.s3.us-west-2.amazonaws.com/space/file/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123";
    assert.equal(mapImageUrl(signedS3, block), `/api/notion-image/${(block as { id: string }).id}`);

    const fileNotionSo = "https://file.notion.so/f/f/space/file/image.png?table=block";
    assert.equal(mapImageUrl(fileNotionSo, block), `/api/notion-image/${(block as { id: string }).id}`);

    const notionStatic = "https://s3-us-west-2.amazonaws.com/secure.notion-static.com/abc/img.png?X-Amz-Signature=xyz";
    assert.equal(mapImageUrl(notionStatic, block), `/api/notion-image/${(block as { id: string }).id}`);

    const notionStaticHost = "https://secure.notion-static.com/abc/img.png";
    assert.equal(mapImageUrl(notionStaticHost, block), `/api/notion-image/${(block as { id: string }).id}`);

    const externalUrl = "https://example.com/a.png";
    const mappedExternal = mapImageUrl(externalUrl, block);
    assert.ok(mappedExternal && !mappedExternal.startsWith("/api/notion-image/"));
    assert.ok(mappedExternal.includes(encodeURIComponent(externalUrl)));

    assert.equal(mapImageUrl(signedS3, undefined as never), signedS3);
    assert.equal(mapImageUrl(externalUrl, undefined as never), externalUrl);
    assert.equal(mapImageUrl(undefined, block), undefined);
});

// Run: npm test  (node --test with built-in TypeScript type stripping)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
    formatDate,
    htmlLang,
    readingMinutes,
    normalizeHeadings,
    extractToc,
    pageText,
    adjacentPosts,
    imageSizeFromBytes,
    signedS3Url,
    livePosts,
    pairingProblems,
    hasCjk,
    cjkInCode,
} from "./post-utils.ts";

test("formatDate renders YYYY–MM–DD with en dashes", () => {
    assert.equal(formatDate("2026-11-21"), "2026–11–21");
    assert.equal(formatDate("2026-11-21T08:00:00.000+09:00"), "2026–11–21");
    assert.equal(formatDate(""), "");
});

test("htmlLang maps the Notion Lang select to a BCP 47 tag", () => {
    assert.equal(htmlLang("zh"), "zh-CN");
    assert.equal(htmlLang("ja"), "ja");
    assert.equal(htmlLang("en"), "en");
    assert.equal(htmlLang(""), "zh-CN");
});

test("readingMinutes counts CJK characters and Latin words", () => {
    assert.equal(readingMinutes(""), 1);
    assert.equal(readingMinutes("字".repeat(800)), 2); // 400 CJK chars a minute
    assert.equal(readingMinutes("word ".repeat(400)), 2); // 200 words a minute
    assert.equal(readingMinutes("字".repeat(400) + " word".repeat(200)), 2);
});

// A small record map: page -> [h2, text, h3, toggle -> [h3]]
const block = (id: string, type: string, title?: string, content?: string[]) => ({
    value: { id, type, properties: title ? { title: [[title]] } : undefined, content },
});
const makeMap = (types: [string, string][]) => ({
    block: {
        page: block("page", "page", "Post", types.map(([id]) => id)),
        ...Object.fromEntries(types.map(([id, type]) => [id, block(id, type, `t-${id}`)])),
    },
});

test("normalizeHeadings promotes headings when the post has no top-level heading", () => {
    const map = makeMap([["a-1", "sub_header"], ["b-2", "text"], ["c-3", "sub_sub_header"]]);
    normalizeHeadings(map as never);
    assert.equal(map.block["a-1"].value.type, "header");
    assert.equal(map.block["b-2"].value.type, "text");
    assert.equal(map.block["c-3"].value.type, "sub_header");
});

test("normalizeHeadings leaves posts that already use heading 1 alone", () => {
    const map = makeMap([["a-1", "header"], ["c-3", "sub_header"]]);
    normalizeHeadings(map as never);
    assert.equal(map.block["a-1"].value.type, "header");
    assert.equal(map.block["c-3"].value.type, "sub_header");
});

test("extractToc lists headings in page order with dashless ids", () => {
    const map = makeMap([["aaaa-1", "header"], ["bbbb-2", "text"], ["cccc-3", "sub_header"], ["dddd-4", "sub_sub_header"]]);
    assert.deepEqual(extractToc(map as never, "page"), [
        { id: "aaaa1", text: "t-aaaa-1", level: 1 },
        { id: "cccc3", text: "t-cccc-3", level: 2 },
    ]);
});

test("extractToc follows nested content such as toggles", () => {
    const map = makeMap([["t-1", "toggle"]]);
    (map.block as Record<string, unknown>)["h-2"] = block("h-2", "header", "inner");
    map.block["t-1"].value.content = ["h-2"];
    assert.deepEqual(extractToc(map as never, "page"), [{ id: "h2", text: "inner", level: 1 }]);
});

test("pageText joins the plain text of every block", () => {
    const map = makeMap([["a", "text"], ["b", "header"]]);
    assert.equal(pageText(map as never, "page"), "t-a\nt-b");
});

test("adjacentPosts: previous is older, next is newer (list is newest first)", () => {
    const posts = [{ slug: "new" }, { slug: "mid" }, { slug: "old" }];
    assert.deepEqual(adjacentPosts(posts, "mid"), { previous: { slug: "old" }, next: { slug: "new" } });
    assert.deepEqual(adjacentPosts(posts, "new"), { previous: { slug: "mid" }, next: null });
    assert.deepEqual(adjacentPosts(posts, "missing"), { previous: null, next: null });
});

test("imageSizeFromBytes reads PNG, JPEG, GIF and WebP headers", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    new DataView(png.buffer).setUint32(16, 1600);
    new DataView(png.buffer).setUint32(20, 900);
    assert.deepEqual(imageSizeFromBytes(png), { width: 1600, height: 900 });

    // JPEG: SOI, an APP0 segment, then SOF0 with height 300, width 400
    const jpeg = new Uint8Array([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
        0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x2c, 0x01, 0x90,
    ]);
    assert.deepEqual(imageSizeFromBytes(jpeg), { width: 400, height: 300 });

    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x20, 0x00, 0x10, 0x00]);
    assert.deepEqual(imageSizeFromBytes(gif), { width: 32, height: 16 });

    // WebP VP8X: canvas width-1 and height-1 as 24-bit little endian at 24 and 27
    const webp = new Uint8Array(30);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58], 8);
    webp.set([0x7f, 0x02, 0x00], 24); // 640 - 1
    webp.set([0xdf, 0x01, 0x00], 27); // 480 - 1
    assert.deepEqual(imageSizeFromBytes(webp), { width: 640, height: 480 });

    assert.equal(imageSizeFromBytes(new Uint8Array([1, 2, 3])), null);
});

// Notion image proxy rejects never-web-published pages (FB-054)
test("signedS3Url keeps signed S3 URLs direct and strips spaceId", () => {
    const signed = "https://prod-files-secure.s3.us-west-2.amazonaws.com/space/file/image.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123";
    assert.equal(signedS3Url(signed), signed);
    assert.equal(signedS3Url(`${signed}&spaceId=abc`), signed);
    assert.equal(signedS3Url("https://www.notion.so/image/https%3A%2F%2Fexample.com%2Fa.png?table=block&id=123"), null);
    assert.equal(signedS3Url("https://prod-files-secure.s3.us-west-2.amazonaws.com/space/file/image.png?spaceId=abc"), null);
    assert.equal(signedS3Url("not a url"), null);
});

test("livePosts requires an exact published zh + en pair and keeps input order", () => {
    const posts = [
        { id: "1", slug: "paired-new", lang: "zh" },
        { id: "2", slug: "paired-new", lang: "en" },
        { id: "3", slug: "zh-only", lang: "zh" },
        { id: "4", slug: "en-only", lang: "en" },
        { id: "5", slug: "ja-only", lang: "ja" },
        { id: "6", slug: "dup-zh", lang: "zh" },
        { id: "7", slug: "dup-zh", lang: "zh" },
        { id: "8", slug: "dup-zh", lang: "en" },
        { id: "9", slug: "paired-with-ja", lang: "zh" },
        { id: "10", slug: "paired-with-ja", lang: "en" },
        { id: "11", slug: "paired-with-ja", lang: "ja" },
        { id: "12", slug: "", lang: "zh" },
        { id: "13", slug: "", lang: "en" },
        { id: "14", slug: "paired-old", lang: "en" },
        { id: "15", slug: "paired-old", lang: "zh" },
    ];

    assert.deepEqual(
        livePosts(posts, "en").map((p) => p.slug),
        ["paired-new", "paired-with-ja", "paired-old"]
    );
    assert.deepEqual(
        livePosts(posts, "zh").map((p) => p.slug),
        ["paired-new", "paired-with-ja", "paired-old"]
    );
});

test("pairingProblems reports unpaired, duplicate, unsupported-lang, and slugless rows", () => {
    assert.deepEqual(
        pairingProblems([
            { slug: "ok", lang: "en", title: "OK" },
            { slug: "ok", lang: "zh", title: "好" },
        ]),
        []
    );

    const problems = pairingProblems([
        { slug: "zh-only", lang: "zh", title: "Only ZH" },
        { slug: "en-only", lang: "en", title: "Only EN" },
        { slug: "dup-zh", lang: "zh", title: "Dup 1" },
        { slug: "dup-zh", lang: "zh", title: "Dup 2" },
        { slug: "dup-zh", lang: "en", title: "Dup EN" },
        { slug: "ja-post", lang: "ja", title: "JA" },
        { slug: "", lang: "en", title: "No Slug" },
    ]);

    assert.equal(problems.length, 5);
    assert.deepEqual(problems.map((p) => p.slug), ["", "zh-only", "en-only", "dup-zh", "ja-post"]);
});

test("hasCjk detects CJK characters without stateful /g side effects", () => {
    assert.equal(hasCjk(""), false);
    assert.equal(hasCjk("const x = 1 + 2;"), false);
    assert.equal(hasCjk("// 中文注释"), true);
    assert.equal(hasCjk("// 日本語"), true);
    // Repeated calls must remain consistent
    assert.equal(hasCjk("中文"), true);
    assert.equal(hasCjk("中文"), true);
});

test("cjkInCode returns only code blocks containing CJK, including nested blocks", () => {
    const map = {
        block: {
            page: block("page", "page", "Post", ["t-1", "c-en", "c-zh", "tog-1"]),
            "t-1": block("t-1", "text", "正文里有中文"),
            "c-en": block("c-en", "code", "const ok = true;"),
            "c-zh": block("c-zh", "code", "const msg = '你好';"),
            "tog-1": block("tog-1", "toggle", "More", ["c-nested"]),
            "c-nested": block("c-nested", "code", "# 注释"),
        },
    };
    assert.deepEqual(cjkInCode(map as never, "page"), ["const msg = '你好';", "# 注释"]);
});

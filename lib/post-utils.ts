// Pure helpers for posts and Notion record maps. No runtime imports, so
// `node --test` can run them directly (see post-utils.test.ts).
import type { ExtendedRecordMap } from "notion-types";

/** "2026-11-21" or an ISO timestamp -> "2026–11–21" (en dashes). */
export const formatDate = (date: string): string => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
    return m ? `${m[1]}–${m[2]}–${m[3]}` : date;
};

/** Notion `Lang` select value -> HTML lang attribute. */
export const htmlLang = (lang: string): string => {
    if (lang === "ja") return "ja";
    if (lang === "en") return "en";
    return "zh-CN";
};

const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/g;

/** Minutes to read: 400 CJK characters or 200 Latin words a minute. */
export const readingMinutes = (text: string): number => {
    const cjk = (text.match(CJK) || []).length;
    const words = text.replace(CJK, " ").split(/\s+/).filter((w) => /\w/.test(w)).length;
    return Math.max(1, Math.round(cjk / 400 + words / 200));
};

type Block = { id: string; type: string; properties?: { title?: unknown[][] }; content?: string[] };

const getBlock = (recordMap: ExtendedRecordMap, id: string): Block | undefined =>
    (recordMap.block[id]?.value as unknown as Block) ?? undefined;

const blockText = (block: Block): string =>
    (block.properties?.title ?? []).map((chunk) => String(chunk[0] ?? "")).join("");

/** Depth-first walk over a page's blocks in reading order. */
const walk = (recordMap: ExtendedRecordMap, rootId: string, visit: (b: Block) => void) => {
    const root = getBlock(recordMap, rootId);
    const visitChildren = (ids: string[] = []) => {
        for (const id of ids) {
            const b = getBlock(recordMap, id);
            if (!b) continue;
            visit(b);
            if (b.type !== "page") visitChildren(b.content);
        }
    };
    visitChildren(root?.content);
};

const HEADING_LEVEL: Record<string, number> = { header: 1, sub_header: 2, sub_sub_header: 3 };

/**
 * Posts written with Notion's Heading 2/3 only would render as <h3>/<h4> right
 * under the page <h1>. Promote them one level so the outline starts at <h2>.
 */
export const normalizeHeadings = (recordMap: ExtendedRecordMap): ExtendedRecordMap => {
    const blocks = Object.values(recordMap.block).map((e) => e?.value as unknown as Block | undefined);
    if (blocks.some((b) => b?.type === "header")) return recordMap;
    for (const b of blocks) {
        if (b?.type === "sub_header") b.type = "header";
        else if (b?.type === "sub_sub_header") b.type = "sub_header";
    }
    return recordMap;
};

export interface TocItem {
    id: string; // matches react-notion-x's anchor id (block id without dashes)
    text: string;
    level: number; // 1 = <h2>, 2 = <h3>
}

/** The two top heading levels, in page order, for the table of contents. */
export const extractToc = (recordMap: ExtendedRecordMap, pageId: string): TocItem[] => {
    const items: TocItem[] = [];
    walk(recordMap, pageId, (b) => {
        const level = HEADING_LEVEL[b.type];
        if (level && level <= 2) items.push({ id: b.id.replace(/-/g, ""), text: blockText(b), level });
    });
    return items;
};

/** Plain text of every block, one per line (for reading time). */
export const pageText = (recordMap: ExtendedRecordMap, pageId: string): string => {
    const lines: string[] = [];
    walk(recordMap, pageId, (b) => {
        const t = blockText(b);
        if (t) lines.push(t);
    });
    return lines.join("\n");
};

/** Posts are listed newest first: previous = older post, next = newer post. */
export const adjacentPosts = <T extends { slug: string }>(posts: T[], slug: string) => {
    const i = posts.findIndex((p) => p.slug === slug);
    if (i < 0) return { previous: null, next: null };
    return { previous: posts[i + 1] ?? null, next: i > 0 ? posts[i - 1] : null };
};

/** Width and height from the first bytes of a PNG, JPEG, GIF or WebP file. */
export const imageSizeFromBytes = (bytes: Uint8Array): { width: number; height: number } | null => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const ascii = (start: number, len: number) => String.fromCharCode(...bytes.subarray(start, start + len));
    try {
        if (bytes[0] === 0x89 && ascii(1, 3) === "PNG") {
            return { width: view.getUint32(16), height: view.getUint32(20) };
        }
        if (ascii(0, 3) === "GIF") {
            return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
        }
        if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
            const chunk = ascii(12, 4);
            const u24 = (o: number) => bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16);
            if (chunk === "VP8X") return { width: u24(24) + 1, height: u24(27) + 1 };
            if (chunk === "VP8 ") return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
            if (chunk === "VP8L") {
                const b = view.getUint32(21, true);
                return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
            }
        }
        if (bytes[0] === 0xff && bytes[1] === 0xd8) {
            let o = 2;
            while (o + 8 < bytes.length) {
                if (bytes[o] !== 0xff) return null;
                const marker = bytes[o + 1];
                const len = view.getUint16(o + 2);
                // SOF0..SOF15 except DHT (C4), JPG (C8) and DAC (CC)
                if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
                    return { width: view.getUint16(o + 7), height: view.getUint16(o + 5) };
                }
                o += 2 + len;
            }
        }
    } catch {
        return null;
    }
    return null;
};

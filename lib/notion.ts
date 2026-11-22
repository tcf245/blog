import { Client } from "@notionhq/client";
import { NotionCompatAPI } from "notion-compat";
import type { ExtendedRecordMap } from "notion-types";
import { defaultMapImageUrl } from "notion-utils";
import { cache } from "react";
import { imageSizeFromBytes, normalizeHeadings } from "./post-utils";

console.log(`[lib/notion.ts] Module loaded. NOTION_TOKEN is ${process.env.NOTION_TOKEN ? 'defined' : 'undefined'}`);

// Official Client for querying Database (SSR/ISR)
// Use Node's built-in fetch: the bundled node-fetch 2 calls url.parse() on
// every request, which logs a DEP0169 warning at error level on Vercel.
const notion = new Client({
    auth: process.env.NOTION_TOKEN,
    fetch: globalThis.fetch as never,
});

// Page content for react-notion-x, read through the official API with the same
// integration token and converted to a RecordMap. Pages do not need to be
// published to the web: ticking `Published` in the database is the only switch.
const notionCompat = new NotionCompatAPI(notion);

// Helper to ensure Database ID is in UUID format (with dashes)
const formatUUID = (id: string) => {
    if (id.length === 36) return id;
    if (id.length !== 32) return id;
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
};

const isValidNotionId = (id: string) => {
    const cleanId = id.replace(/-/g, "");
    return /^[a-fA-F0-9]{32}$/.test(cleanId);
};

export interface Post {
    id: string;
    title: string;
    date: string;
    slug: string;
    tags: string[];
    lang: string;
    preview: string;
}

// Helper for retry logic with exponential backoff
const withRetry = async <T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
    apiName = "Notion API"
): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;
        console.warn(`${apiName} failed. Retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return withRetry(fn, retries - 1, delay * 2, apiName);
    }
};

// The fields we read from a database row. The SDK's own page type is a wide
// union, so rows are narrowed to this shape once, here.
type RichText = { plain_text: string }[];
interface PostRow {
    id: string;
    properties: {
        Name?: { title?: RichText };
        Date?: { date?: { start?: string } | null };
        Slug?: { rich_text?: RichText };
        Tags?: { multi_select?: { name: string }[] };
        Lang?: { select?: { name?: string } | null };
    };
}
type PreviewBlock = { type?: string; paragraph?: { rich_text: RichText } };

const plainText = (text: RichText = []) => text.map((t) => t.plain_text).join("");

// The first paragraphs of a page, as the list preview.
const fetchPreview = async (pageId: string, label: string): Promise<string> => {
    const content = await withRetry(() => notion.blocks.children.list({
        block_id: pageId,
        page_size: 3, // Fetch first 3 blocks for preview
    }), 3, 500, `notion.blocks.children.list (preview for ${label})`)
        .catch(err => {
            console.error(`Failed to fetch preview for ${label}`, err);
            return { results: [] };
        });
    return (content.results as PreviewBlock[])
        .map((block) => (block.type === "paragraph" ? plainText(block.paragraph?.rich_text) : ""))
        .join(" ").slice(0, 200) + "...";
};

const toPost = async (row: PostRow, label: string, fallbackDate: string): Promise<Post> => {
    const props = row.properties;
    return {
        id: row.id,
        title: props.Name?.title?.[0]?.plain_text || "Untitled",
        date: props.Date?.date?.start || fallbackDate,
        slug: props.Slug?.rich_text?.[0]?.plain_text || "",
        tags: props.Tags?.multi_select?.map((tag) => tag.name) || [],
        lang: props.Lang?.select?.name || "en",
        preview: await fetchPreview(row.id, label),
    };
};

export const getDatabase = cache(async (): Promise<Post[]> => {
    console.log("Attempting to get database...");
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
        console.warn("NOTION_DATABASE_ID is not defined on Vercel.");
        return [];
    }
    console.log(`Found NOTION_DATABASE_ID: ${databaseId ? 'Yes' : 'No'}`);

    // Basic validation: Database ID should be 32 or 36 characters (hexdash)
    if (!isValidNotionId(databaseId)) {
        console.error(`Error: NOTION_DATABASE_ID is invalid ("${databaseId}"). It must be a 32-character hex ID.`);
        return [];
    }

    try {
        const formattedId = formatUUID(databaseId.replace(/-/g, ""));

        // Retry logic for database query
        const response = await withRetry(() => notion.databases.query({
            database_id: formattedId,
            filter: {
                property: "Published",
                checkbox: { equals: true },
            },
            sorts: [{ property: "Date", direction: "descending" }],
        }), 3, 1000, "notion.databases.query");

        console.log(`Found ${response.results.length} posts in database.`);

        const today = new Date().toISOString().split('T')[0];
        const posts = await Promise.all((response.results as unknown as PostRow[]).map(
            (row) => toPost(row, row.id, today),
        ));

        return posts;
    } catch (error) {
        console.error("Failed to query Notion database on Vercel. Check your ID and Token.", error);
        return [];
    }
});

export const getPostBySlug = cache(async (slug: string): Promise<Post | null> => {
    console.log(`Attempting to get post by slug: ${slug}`);
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
        console.warn("NOTION_DATABASE_ID is not defined for getPostBySlug on Vercel.");
        return null;
    }
    console.log(`Found NOTION_DATABASE_ID for getPostBySlug: ${databaseId ? 'Yes' : 'No'}`);

    // Basic validation
    if (!isValidNotionId(databaseId)) {
        console.error(`Error: NOTION_DATABASE_ID is invalid ("${databaseId}").`);
        return null;
    }

    try {
        const formattedId = formatUUID(databaseId.replace(/-/g, ""));

        // Retry logic for database query by slug
        const response = await withRetry(() => notion.databases.query({
            database_id: formattedId,
            filter: {
                and: [
                    {
                        property: "Published",
                        checkbox: { equals: true },
                    },
                    {
                        property: "Slug",
                        rich_text: { equals: slug },
                    },
                ],
            },
        }), 3, 1000, `notion.databases.query (slug: ${slug})`);

        console.log(`Found ${response.results.length} results for slug: ${slug}`);
        if (response.results.length === 0) return null;

        return await toPost(response.results[0] as unknown as PostRow, slug, "");
    } catch (error) {
        console.error(`Failed to fetch post by slug ${slug} on Vercel.`, error);
        return null;
    }
});

// notion-compat 7.12 wraps each image caption item in an extra array
// (caption = [[[text, ...]]] instead of [[text, ...]]), which makes
// react-notion-x call .split on an array and crash the page. Flatten it.
// The image block fields read below (notion-types' Block union is too wide).
interface ImageBlock {
    id: string;
    type?: string;
    space_id?: string;
    properties?: { source?: string[][]; caption?: unknown[][] };
}

const imageBlocks = (recordMap: ExtendedRecordMap): ImageBlock[] =>
    Object.values(recordMap.block)
        .map((entry) => entry?.value as unknown as ImageBlock | undefined)
        .filter((block): block is ImageBlock => block?.type === "image");

const fixImageCaptions = (recordMap: ExtendedRecordMap): ExtendedRecordMap => {
    for (const block of imageBlocks(recordMap)) {
        const caption = block.properties?.caption;
        if (caption && Array.isArray(caption[0]?.[0])) {
            block.properties!.caption = caption.flat(1) as unknown[][];
        }
    }
    return recordMap;
};

// The URL react-notion-x's <Asset> passes to its image component, derived the
// same way (react-notion-x 7.12 Asset, image branch). It is the key for
// recordMap.preview_images.
const renderedImageUrl = (recordMap: ExtendedRecordMap, block: ImageBlock): string | null => {
    let source: string | undefined =
        recordMap.signed_urls?.[block.id] || block.properties?.source?.[0]?.[0];
    if (!source) return null;
    if (block.space_id) {
        const url = new URL(source);
        url.searchParams.set("spaceId", block.space_id);
        source = url.toString();
    }
    if (!source.includes(".gif") && source.includes("file.notion.so")) {
        source = block.properties?.source?.[0]?.[0];
    }
    return source ? defaultMapImageUrl(source, block as never) ?? null : null;
};

// The official API gives no image dimensions, so images render with no height
// until they load and shift the text below (CLS). Read each image's size from
// its first bytes and hand it to react-notion-x as a preview image: it then
// reserves the space and lazy-loads the real image.
const TRANSPARENT_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const addImageSizes = async (recordMap: ExtendedRecordMap): Promise<ExtendedRecordMap> => {
    const images = imageBlocks(recordMap);
    const previews: Record<string, unknown> = { ...(recordMap.preview_images ?? {}) };
    await Promise.all(images.map(async (block) => {
        const key = renderedImageUrl(recordMap, block);
        const source = recordMap.signed_urls?.[block.id] || block.properties?.source?.[0]?.[0];
        if (!key || !source) return;
        try {
            const res = await fetch(source, {
                headers: { Range: "bytes=0-65535" },
                signal: AbortSignal.timeout(3000),
            });
            const size = imageSizeFromBytes(new Uint8Array(await res.arrayBuffer()));
            if (size) {
                previews[key] = {
                    originalWidth: size.width,
                    originalHeight: size.height,
                    dataURIBase64: TRANSPARENT_PIXEL,
                };
            }
        } catch (err) {
            console.warn(`Could not read image size for block ${block.id}`, err);
        }
    }));
    recordMap.preview_images = previews as ExtendedRecordMap["preview_images"];
    return recordMap;
};

export const getPageContent = cache(async (pageId: string) => {
    // Retry logic for fetching full page content (react-notion-x)
    const recordMap = await withRetry(
        () => notionCompat.getPage(formatUUID(pageId)),
        3,
        2000,
        `notionCompat.getPage (${pageId})`
    );
    return addImageSizes(normalizeHeadings(fixImageCaptions(recordMap)));
});

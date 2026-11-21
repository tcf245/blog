import { Client } from "@notionhq/client";
import { NotionCompatAPI } from "notion-compat";
import type { ExtendedRecordMap } from "notion-types";

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

export const getDatabase = async (): Promise<Post[]> => {
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

        const posts = await Promise.all(response.results.map(async (page: any) => {
            const props = page.properties;
            const pageId = page.id;

            // Retry logic for fetching page content (blocks) for preview
            const content = await withRetry(() => notion.blocks.children.list({
                block_id: pageId,
                page_size: 3, // Fetch first 3 blocks for preview
            }), 3, 500, `notion.blocks.children.list (preview for ${pageId})`)
                .catch(err => {
                    console.error(`Failed to fetch preview for page ${pageId}`, err);
                    return { results: [] };
                });

            const preview = content.results.map((block: any) => {
                if (block.type === 'paragraph') {
                    return block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
                }
                return '';
            }).join(' ').slice(0, 200) + '...';

            return {
                id: page.id,
                title: props.Name?.title?.[0]?.plain_text || "Untitled",
                date: props.Date?.date?.start || new Date().toISOString().split('T')[0],
                slug: props.Slug?.rich_text?.[0]?.plain_text || "",
                tags: props.Tags?.multi_select?.map((tag: any) => tag.name) || [],
                lang: props.Lang?.select?.name || "en",
                preview: preview,
            };
        }));

        return posts;
    } catch (error) {
        console.error("Failed to query Notion database on Vercel. Check your ID and Token.", error);
        return [];
    }
};

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
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

        const page: any = response.results[0];
        const props = page.properties;
        const pageId = page.id;

        // Retry logic for preview blocks
        const content = await withRetry(() => notion.blocks.children.list({
            block_id: pageId,
            page_size: 3, // Fetch first 3 blocks for preview
        }), 3, 500, `notion.blocks.children.list (preview for ${slug})`)
            .catch(err => {
                console.error(`Failed to fetch preview for slug ${slug}`, err);
                return { results: [] };
            });

        const preview = content.results.map((block: any) => {
            if (block.type === 'paragraph') {
                return block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
            }
            return '';
        }).join(' ').slice(0, 200) + '...';

        return {
            id: page.id,
            title: props.Name?.title?.[0]?.plain_text || "Untitled",
            date: props.Date?.date?.start || "",
            slug: props.Slug?.rich_text?.[0]?.plain_text || "",
            tags: props.Tags?.multi_select?.map((tag: any) => tag.name) || [],
            lang: props.Lang?.select?.name || "en",
            preview: preview,
        };
    } catch (error) {
        console.error(`Failed to fetch post by slug ${slug} on Vercel.`, error);
        return null;
    }
};

// notion-compat 7.12 wraps each image caption item in an extra array
// (caption = [[[text, ...]]] instead of [[text, ...]]), which makes
// react-notion-x call .split on an array and crash the page. Flatten it.
const fixImageCaptions = (recordMap: ExtendedRecordMap): ExtendedRecordMap => {
    for (const entry of Object.values(recordMap.block)) {
        const block: any = entry?.value;
        const caption = block?.properties?.caption;
        if (block?.type === "image" && Array.isArray(caption?.[0]?.[0])) {
            block.properties.caption = caption.flat(1);
        }
    }
    return recordMap;
};

export const getPageContent = async (pageId: string) => {
    // Retry logic for fetching full page content (react-notion-x)
    const recordMap = await withRetry(
        () => notionCompat.getPage(formatUUID(pageId)),
        3,
        2000,
        `notionCompat.getPage (${pageId})`
    );
    return fixImageCaptions(recordMap);
};
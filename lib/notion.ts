import { Client } from "@notionhq/client";
import { NotionAPI } from "notion-client";

// Official Client for querying Database (SSR/ISR)
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Unofficial Client for fetching Page RecordMap (for react-notion-x)
const notionAPI = new NotionAPI();

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
        const response = await notion.databases.query({
            database_id: formattedId,
            filter: {
                property: "Published",
                checkbox: { equals: true },
            },
            sorts: [{ property: "Date", direction: "descending" }],
        });

        console.log(`Found ${response.results.length} posts in database.`);

        const posts = await Promise.all(response.results.map(async (page: any) => {
            const props = page.properties;
            const pageId = page.id;

            const content = await notion.blocks.children.list({
                block_id: pageId,
                page_size: 3, // Fetch first 3 blocks for preview
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
        const response = await notion.databases.query({
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
        });

        console.log(`Found ${response.results.length} results for slug: ${slug}`);
        if (response.results.length === 0) return null;

        const page: any = response.results[0];
        const props = page.properties;
        const pageId = page.id;

        const content = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 3, // Fetch first 3 blocks for preview
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

export const getPageContent = async (pageId: string) => {
    return await notionAPI.getPage(formatUUID(pageId));
};
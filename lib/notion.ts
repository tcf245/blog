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
}

export const getDatabase = async (): Promise<Post[]> => {
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) {
        console.warn("NOTION_DATABASE_ID is not defined");
        return [];
    }

    // Basic validation: Database ID should be 32 or 36 characters (hexdash)
    if (!isValidNotionId(databaseId)) {
        console.error(`Error: NOTION_DATABASE_ID is invalid ("${databaseId}"). It must be a 32-character hex ID.`);
        return [];
    }

    try {
        const formattedId = formatUUID(databaseId.replace(/-/g, ""));
        const response = await notion.request({
            path: `databases/${formattedId}/query`,
            method: "post",
            body: {
                filter: {
                    property: "Published",
                    checkbox: { equals: true },
                },
                sorts: [{ property: "Date", direction: "descending" }],
            },
        }) as any;

        return response.results.map((page: any) => {
            const props = page.properties;
            return {
                id: page.id,
                title: props.Name?.title?.[0]?.plain_text || "Untitled",
                date: props.Date?.date?.start || new Date().toISOString().split('T')[0],
                slug: props.Slug?.rich_text?.[0]?.plain_text || "",
                tags: props.Tags?.multi_select?.map((tag: any) => tag.name) || [],
                lang: props.Lang?.select?.name || "en",
            };
        });
    } catch (error) {
        console.error("Failed to query Notion database. Check your ID and Token.", error);
        return [];
    }
};

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) return null;

    // Basic validation
    if (!isValidNotionId(databaseId)) {
        console.error(`Error: NOTION_DATABASE_ID is invalid ("${databaseId}").`);
        return null;
    }

    try {
        const formattedId = formatUUID(databaseId.replace(/-/g, ""));
        const response = await notion.request({
            path: `databases/${formattedId}/query`,
            method: "post",
            body: {
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
            },
        }) as any;

        if (response.results.length === 0) return null;

        const page: any = response.results[0];
        const props = page.properties;
        return {
            id: page.id,
            title: props.Name?.title?.[0]?.plain_text || "Untitled",
            date: props.Date?.date?.start || "",
            slug: props.Slug?.rich_text?.[0]?.plain_text || "",
            tags: props.Tags?.multi_select?.map((tag: any) => tag.name) || [],
            lang: props.Lang?.select?.name || "en",
        };
    } catch (error) {
        console.error(`Failed to fetch post by slug ${slug}.`, error);
        return null;
    }
};

export const getPageContent = async (pageId: string) => {
    return await notionAPI.getPage(pageId);
};

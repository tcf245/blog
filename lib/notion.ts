import { Client } from "@notionhq/client";
import { NotionAPI } from "notion-client";

// Official Client for querying Database (SSR/ISR)
const notion = new Client({ auth: process.env.NOTION_TOKEN });

// Unofficial Client for fetching Page RecordMap (for react-notion-x)
const notionAPI = new NotionAPI();

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

    const response = await (notion.databases as any).query({
        database_id: databaseId,
        filter: {
            property: "Published",
            checkbox: { equals: true },
        },
        sorts: [{ property: "Date", direction: "descending" }],
    });

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
};

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!databaseId) return null;

    const response = await (notion.databases as any).query({
        database_id: databaseId,
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
};

export const getPageContent = async (pageId: string) => {
    return await notionAPI.getPage(pageId);
};

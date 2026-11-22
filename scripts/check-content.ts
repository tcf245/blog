import { Client } from "@notionhq/client";
import { hasCjk, pairingProblems, type ContentRow } from "../lib/post-utils.ts";

const formatUUID = (id: string) => {
    const clean = id.replace(/-/g, "");
    if (clean.length !== 32) return id;
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
};

type RichText = { plain_text: string }[];

interface QueryPage {
    id: string;
    properties: {
        Name?: { title?: RichText };
        Slug?: { rich_text?: RichText };
        Lang?: { select?: { name?: string } | null };
    };
}

interface ChildBlock {
    id: string;
    type: string;
    has_children?: boolean;
    code?: { rich_text?: RichText };
}

interface CodeCjkIssue {
    slug: string;
    lang: string;
    title: string;
    snippet: string;
}

const plainText = (text: RichText = []) => text.map((t) => t.plain_text).join("");

const fetchAllPublishedRows = async (
    notion: Client,
    databaseId: string
): Promise<(ContentRow & { id: string; title: string })[]> => {
    const rows: (ContentRow & { id: string; title: string })[] = [];
    let cursor: string | undefined;

    do {
        const response = await notion.databases.query({
            database_id: databaseId,
            filter: {
                property: "Published",
                checkbox: { equals: true },
            },
            sorts: [{ property: "Date", direction: "descending" }],
            start_cursor: cursor,
        });

        for (const page of response.results as unknown as QueryPage[]) {
            const props = page.properties;
            rows.push({
                id: page.id,
                title: plainText(props.Name?.title) || "Untitled",
                slug: plainText(props.Slug?.rich_text),
                lang: props.Lang?.select?.name || "",
            });
        }

        cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return rows;
};

const findCjkCodeBlocks = async (notion: Client, blockId: string): Promise<string[]> => {
    const matches: string[] = [];
    let cursor: string | undefined;

    do {
        const response = await notion.blocks.children.list({
            block_id: blockId,
            page_size: 100,
            start_cursor: cursor,
        });

        for (const block of response.results as unknown as ChildBlock[]) {
            if (block.type === "code") {
                const codeText = plainText(block.code?.rich_text);
                if (hasCjk(codeText)) {
                    const line =
                        codeText.split(/\r?\n/).find((l) => hasCjk(l))?.trim() || codeText.trim();
                    matches.push(line.slice(0, 80));
                }
            }
            if (block.has_children && block.type !== "child_page" && block.type !== "child_database") {
                matches.push(...(await findCjkCodeBlocks(notion, block.id)));
            }
        }

        cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
    } while (cursor);

    return matches;
};

const main = async () => {
    const missing: string[] = [];
    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_DATABASE_ID;
    if (!token) missing.push("NOTION_TOKEN");
    if (!databaseId) missing.push("NOTION_DATABASE_ID");

    if (missing.length > 0) {
        console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
        process.exit(2);
    }

    const notion = new Client({
        auth: token,
        fetch: globalThis.fetch as never,
    });

    const rows = await fetchAllPublishedRows(notion, formatUUID(databaseId!));
    const pairing = pairingProblems(rows);

    const codeIssues: CodeCjkIssue[] = [];
    for (const row of rows) {
        const snippets = await findCjkCodeBlocks(notion, row.id);
        for (const snippet of snippets) {
            codeIssues.push({
                slug: row.slug || "(no slug)",
                lang: row.lang || "unset",
                title: row.title,
                snippet,
            });
        }
    }

    if (pairing.length === 0 && codeIssues.length === 0) {
        console.log(`OK: ${rows.length} published pages (${rows.length / 2} live pairs), no CJK in code blocks.`);
        process.exit(0);
    }

    if (pairing.length > 0) {
        console.error(`Pairing problems (${pairing.length}):`);
        for (const issue of pairing) {
            const label = issue.slug ? `[${issue.slug}]` : "[no-slug]";
            console.error(`  - ${label} ${issue.reason}`);
        }
    }

    if (codeIssues.length > 0) {
        console.error(`CJK characters in code blocks (${codeIssues.length}):`);
        for (const issue of codeIssues) {
            console.error(`  - [${issue.slug}] (${issue.lang}) "${issue.title}": ${issue.snippet}`);
        }
    }

    process.exit(1);
};

main().catch((err) => {
    console.error("Content check failed:", err instanceof Error ? err.message : err);
    process.exit(1);
});

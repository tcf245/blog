import { Client } from "@notionhq/client";

export const dynamic = 'force-dynamic';

export default async function DebugPage() {
    const token = process.env.NOTION_TOKEN;
    const dbId = process.env.NOTION_DATABASE_ID;

    let status = "Initializing...";
    let error = null;
    let data = null;

    try {
        if (!token) throw new Error("NOTION_TOKEN is missing");
        if (!dbId) throw new Error("NOTION_DATABASE_ID is missing");

        const notion = new Client({ auth: token });
        const response = await notion.databases.retrieve({ database_id: dbId });
        status = "Success";
        data = response;
    } catch (e: any) {
        status = "Failed";
        error = {
            message: e.message,
            code: e.code,
            status: e.status,
            body: e.body
        };
    }

    return (
        <div className="p-8 font-mono text-sm max-w-4xl mx-auto space-y-4">
            <h1 className="text-xl font-bold">Vercel Debugger</h1>

            <div className="border p-4 rounded bg-gray-50">
                <h2 className="font-bold mb-2">Environment Variables</h2>
                <div className="grid grid-cols-[200px_1fr] gap-2">
                    <div>NOTION_TOKEN:</div>
                    <div className={token ? "text-green-600" : "text-red-600"}>
                        {token ? `${token.slice(0, 4)}...${token.slice(-4)}` : "MISSING"}
                    </div>

                    <div>NOTION_DATABASE_ID:</div>
                    <div className={dbId ? "text-green-600" : "text-red-600"}>
                        {dbId ? dbId : "MISSING"}
                    </div>
                </div>
            </div>

            <div className="border p-4 rounded bg-gray-50">
                <h2 className="font-bold mb-2">Connection Test</h2>
                <div>Status: <span className={status === "Success" ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{status}</span></div>
            </div>

            {error && (
                <div className="border p-4 rounded bg-red-50 text-red-900 overflow-auto">
                    <h2 className="font-bold mb-2">Error Details</h2>
                    <pre>{JSON.stringify(error, null, 2)}</pre>
                </div>
            )}

            {data && (
                <div className="border p-4 rounded bg-green-50 overflow-auto">
                    <h2 className="font-bold mb-2">Database Metadata (Success)</h2>
                    <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}

import { notFound } from "next/navigation";
import { getPostBySlug, getPageContent, getDatabase } from "@/lib/notion";
import NotionPage from "@/components/NotionPage";

// ISR: Generate static params for all existing posts
export async function generateStaticParams() {
    const posts = await getDatabase();
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

// Revalidate every 0 seconds

interface PageProps {
    params: { slug: string };
}

export default async function Page({ params }: PageProps) {
    const { slug } = params;
    const post = await getPostBySlug(slug);

    if (!post) {
        notFound();
    }

    const recordMap = await getPageContent(post.id);

    return (
        <main className="max-w-2xl mx-auto px-6 py-20 bg-[#FBFBFA] min-h-screen">
            <article>
                {/* Header */}
                <header className="mb-12 border-b border-neutral-200 pb-8">
                    <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 mb-4">
                        <time>{post.date}</time>
                        <span className="w-px h-3 bg-neutral-300"></span>
                        <span className="uppercase tracking-wider">{post.tags.join(", ")}</span>
                    </div>
                    <h1 className="text-3xl font-bold text-[#1E1E1E] leading-tight">
                        {post.title}
                    </h1>
                </header>

                {/* Content */}
                <div className="">
                    <NotionPage recordMap={recordMap} />
                </div>
            </article>
        </main>
    );
}

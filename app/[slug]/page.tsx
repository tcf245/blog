import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, getPageContent, getDatabase } from "@/lib/notion";
import NotionPage from "@/components/NotionPage";

// Generate static params for existing posts (pre-rendering)
export async function generateStaticParams() {
    const posts = await getDatabase();
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

// Revalidate every 60 seconds
export const revalidate = 60;

// Allow new pages to be generated on demand (true is default, but explicit is good)
export const dynamicParams = true;

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
                {/* Site Header (Navigation) */}
                <header className="mb-16">
                    <h1 className="text-2xl font-semibold text-[#2C2C2A]">
                        <Link href="/" className="hover:text-neutral-700 transition-colors">My Blog</Link>
                    </h1>
                </header>

                {/* Back Link */}
                <div className="mb-8">
                    <Link href="/" className="inline-flex items-center text-sm text-neutral-500 hover:text-neutral-800 transition-colors group">
                        <span className="mr-1 group-hover:-translate-x-1 transition-transform">←</span> Back to Home
                    </Link>
                </div>

                {/* Article Header */}
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

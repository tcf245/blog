import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPostBySlug, getPageContent, getDatabase } from "@/lib/notion";
import { adjacentPosts, extractToc, htmlLang, pageText, readingMinutes } from "@/lib/post-utils";
import NotionPage from "@/components/NotionPage";
import SiteHeader from "@/components/SiteHeader";
import PostMeta from "@/components/PostMeta";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const post = await getPostBySlug(params.slug);
    if (!post) return {};
    return {
        title: post.title,
        description: post.preview.replace(/\s+/g, " ").slice(0, 160),
    };
}

export default async function Page({ params }: PageProps) {
    const { slug } = params;
    const post = await getPostBySlug(slug);

    if (!post) {
        notFound();
    }

    const [recordMap, posts] = await Promise.all([getPageContent(post.id), getDatabase()]);
    const pageId = post.id; // dashed UUID, the record map's root block key
    // Top-level sections only: a short, quiet outline.
    const toc = extractToc(recordMap, pageId).filter((item) => item.level === 1);
    const minutes = readingMinutes(pageText(recordMap, pageId));
    const { previous, next } = adjacentPosts(posts, slug);

    return (
        <main className="site-shell py-12 sm:py-16 min-h-screen">
            <article lang={htmlLang(post.lang)}>
                <div className="reading">
                    <SiteHeader back />

                    <header className="mb-8 border-b border-[var(--color-rule)] pb-6">
                        <div className="mb-3">
                            <PostMeta date={post.date} tags={post.tags} minutes={minutes} lang={post.lang} />
                        </div>
                        <h1 className="text-[1.625rem] sm:text-3xl font-bold text-[var(--color-heading)] leading-snug">
                            {post.title}
                        </h1>
                    </header>
                </div>

                {toc.length > 2 && (
                    <nav className="toc" aria-label="Table of contents">
                        <div className="toc-title">Contents</div>
                        {toc.map((item) => (
                            <a key={item.id} href={`#${item.id}`}>
                                {item.text}
                            </a>
                        ))}
                    </nav>
                )}

                <NotionPage recordMap={recordMap} />

                <footer className="reading post-end">
                    {(previous || next) && (
                        <nav className="post-pager" aria-label="More posts">
                            {previous && (
                                <Link href={`/${previous.slug}`}>
                                    <span className="post-pager-label">← Previous</span>
                                    <span className="post-pager-title">{previous.title}</span>
                                </Link>
                            )}
                            {next && (
                                <Link href={`/${next.slug}`} className="post-pager-next">
                                    <span className="post-pager-label">Next →</span>
                                    <span className="post-pager-title">{next.title}</span>
                                </Link>
                            )}
                        </nav>
                    )}
                </footer>
            </article>
        </main>
    );
}

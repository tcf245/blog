import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import NotionPage from "@/components/NotionPage";
import PostMeta from "@/components/PostMeta";
import SiteHeader from "@/components/SiteHeader";
import { htmlLangFor, isLang, otherLang } from "@/lib/i18n";
import { getLivePosts, getPageContent, getPostBySlug } from "@/lib/notion";
import { adjacentPosts, extractToc, pageText, readingMinutes } from "@/lib/post-utils";

// Generate static params for existing live posts in each language
export async function generateStaticParams({ params }: { params: { lang: string } }) {
    if (!isLang(params.lang)) return [];
    const posts = await getLivePosts(params.lang);
    return posts.map((post) => ({
        slug: post.slug,
    }));
}

// Revalidate every 60 seconds
export const revalidate = 60;

// Allow new pages to be generated on demand (true is default, but explicit is good)
export const dynamicParams = true;

interface PageProps {
    params: Promise<{ lang: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { lang, slug } = await params;
    if (!isLang(lang)) return {};
    const post = await getPostBySlug(slug, lang);
    if (!post) return {};
    return {
        title: post.title,
        description: post.preview.replace(/\s+/g, " ").slice(0, 160),
        alternates: {
            canonical: `/${lang}/${slug}`,
            // Only versions that exist; a pending translation is not announced.
            languages: (await getPostBySlug(slug, otherLang(lang)))
                ? { en: `/en/${slug}`, "zh-CN": `/zh/${slug}`, "x-default": `/${slug}` }
                : { [htmlLangFor(lang)]: `/${lang}/${slug}` },
        },
    };
}

export default async function Page({ params }: PageProps) {
    const { lang, slug } = await params;
    if (!isLang(lang)) {
        notFound();
    }

    const [post, translation] = await Promise.all([
        getPostBySlug(slug, lang),
        getPostBySlug(slug, otherLang(lang)),
    ]);
    if (!post) {
        // An old link or the switch can land on a language this post is not in
        // yet: show the version that exists rather than a 404.
        if (translation) redirect(`/${otherLang(lang)}/${slug}`);
        notFound();
    }

    const [recordMap, posts] = await Promise.all([getPageContent(post.id), getLivePosts(lang)]);
    const pageId = post.id; // dashed UUID, the record map's root block key
    // Top-level sections only: a short, quiet outline.
    const toc = extractToc(recordMap, pageId).filter((item) => item.level === 1);
    const minutes = readingMinutes(pageText(recordMap, pageId));
    const { previous, next } = adjacentPosts(posts, slug);

    return (
        <main className="site-shell py-12 sm:py-16 min-h-screen">
            <article lang={htmlLangFor(lang)}>
                <div className="reading">
                    <SiteHeader lang={lang} altHref={translation ? `/${otherLang(lang)}/${slug}` : `/${otherLang(lang)}`} back />

                    <header className="mb-8 border-b border-[var(--color-rule)] pb-6">
                        <div className="mb-3">
                            <PostMeta date={post.date} tags={post.tags} minutes={minutes} />
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
                                <Link href={`/${lang}/${previous.slug}`}>
                                    <span className="post-pager-label">← Previous</span>
                                    <span className="post-pager-title">{previous.title}</span>
                                </Link>
                            )}
                            {next && (
                                <Link href={`/${lang}/${next.slug}`} className="post-pager-next">
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

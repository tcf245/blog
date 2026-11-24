import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { isLang, otherLang } from "@/lib/i18n";
import { getLivePosts } from "@/lib/notion";
import { formatDate } from "@/lib/post-utils";
import { SITE_DESCRIPTION } from "@/lib/site";

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

interface PageProps {
    params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { lang } = await params;
    if (!isLang(lang)) return {};
    return {
        alternates: {
            canonical: `/${lang}`,
            languages: {
                en: "/en",
                "zh-CN": "/zh",
                "x-default": "/",
            },
        },
    };
}

export default async function Home({ params }: PageProps) {
    const { lang } = await params;
    if (!isLang(lang)) {
        notFound();
    }

    const posts = await getLivePosts(lang);

    return (
        <main className="site-shell py-12 sm:py-16">
            <div className="reading">
                <SiteHeader lang={lang} altHref={`/${otherLang(lang)}`} />
                <p className="-mt-6 mb-14 text-[0.9375rem] text-[var(--color-secondary)]">{SITE_DESCRIPTION}</p>

                {posts.length === 0 && (
                    <p className="text-[var(--color-secondary)]">No posts in this language yet.</p>
                )}
                <ol className="post-list">
                    {posts.map((post) => (
                        <li key={post.id}>
                            <Link href={`/${lang}/${post.slug}`} className="post-row group">
                                <time className="post-row-date" dateTime={post.date}>
                                    {formatDate(post.date)}
                                </time>
                                <div className="post-row-main">
                                    <h2 className="post-row-title">{post.title}</h2>
                                    <p className="post-row-preview">{post.preview}</p>
                                </div>
                                {post.tags.length > 0 && (
                                    <span className="post-row-tags">{post.tags.join(", ")}</span>
                                )}
                            </Link>
                        </li>
                    ))}
                </ol>
            </div>
        </main>
    );
}

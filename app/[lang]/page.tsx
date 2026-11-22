import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PostMeta from "@/components/PostMeta";
import SiteHeader from "@/components/SiteHeader";
import { isLang, otherLang } from "@/lib/i18n";
import { getLivePosts } from "@/lib/notion";
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
                <div className="space-y-14">
                    {posts.map((post) => (
                        <Link href={`/${lang}/${post.slug}`} key={post.id} className="block group">
                            <article>
                                <header>
                                    <div className="mb-2">
                                        <PostMeta date={post.date} tags={post.tags} />
                                    </div>
                                    <h2 className="text-2xl font-semibold text-[var(--color-heading)] mb-3 leading-snug group-hover:text-neutral-600 transition-colors">
                                        {post.title}
                                    </h2>
                                </header>
                                <p className="leading-relaxed mb-4">{post.preview}</p>
                                <footer>
                                    <span className="text-[0.9375rem] font-medium text-[var(--color-heading)] group-hover:underline underline-offset-4">
                                        Read more
                                    </span>
                                </footer>
                            </article>
                        </Link>
                    ))}
                </div>
            </div>
        </main>
    );
}

import { getDatabase } from "@/lib/notion";
import { SITE_DESCRIPTION } from "@/lib/site";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import PostMeta from "@/components/PostMeta";

// ISR: Revalidate every 60 seconds
export const revalidate = 60;

export default async function Home() {
    const posts = await getDatabase();

    return (
        <main className="site-shell py-12 sm:py-16">
            <div className="reading">
                <SiteHeader />
                <p className="-mt-6 mb-14 text-[0.9375rem] text-[var(--color-secondary)]">{SITE_DESCRIPTION}</p>

                <div className="space-y-14">
                    {posts.map((post) => (
                        <Link href={`/${post.slug}`} key={post.id} className="block group" lang={post.lang === "en" ? "en" : undefined}>
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

import { getDatabase } from "@/lib/notion";
import Link from "next/link";

// Force static generation for the home page
export const dynamic = "force-static";
export const revalidate = 0;

export default async function Home() {
    const posts = await getDatabase();

    return (
        <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <header className="mb-20">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-semibold text-[#2C2C2A]">
                        <Link href="/" className="hover:text-neutral-700 transition-colors">My Blog</Link>
                    </h1>
                </div>
            </header>

            <div className="space-y-14">
                {posts.map((post) => (
                    <Link href={`/${post.slug}`} key={post.id} className="block group">
                        <article>
                            <header>
                                <div className="text-sm text-neutral-500 mb-2">
                                    <time dateTime={post.date}>{new Date(post.date).toLocaleDateString()}</time>
                                </div>
                                <h2 className="text-2xl font-semibold text-[#2C2C2A] mb-3 leading-tight group-hover:text-neutral-700 transition-colors">
                                    {post.title}
                                </h2>
                            </header>
                            <div className="text-base text-neutral-800 leading-relaxed mb-5">
                                <p>{post.preview}</p>
                            </div>
                            <footer>
                                <div className="text-base font-medium text-neutral-900 group-hover:underline">
                                    Read more
                                </div>
                            </footer>
                        </article>
                    </Link>
                ))}
            </div>
        </main>
    );
}

import Link from "next/link";
import { getDatabase } from "@/lib/notion";

// Revalidate every hour
export const revalidate = 3600;

export default async function Home() {
  const posts = await getDatabase();

  return (
    <main className="max-w-2xl mx-auto px-6 py-20 bg-[#FBFBFA] min-h-screen">
      <header className="mb-24">
        <h1 className="text-3xl font-bold text-[#1E1E1E]">My Blog</h1>
        <p className="text-neutral-500 mt-2">Minimalist thoughts on design and tech.</p>
      </header>

      <section className="space-y-20">
        {posts.map((post) => (
          <Link href={`/${post.slug}`} key={post.id} className="block group">
            <article className="cursor-pointer">
              {/* Date & Tag */}
              <div className="flex items-center gap-3 text-xs font-mono text-neutral-400 mb-3">
                <time>{post.date}</time>
                <span className="w-px h-3 bg-neutral-300"></span>
                <span className="uppercase tracking-wider">{post.tags.join(", ")}</span>
              </div>
              {/* Title */}
              <h2 className="text-2xl font-bold text-[#2C2C2A] group-hover:text-neutral-600 transition-colors">
                {post.title}
              </h2>
            </article>
          </Link>
        ))}

        {posts.length === 0 && (
          <p className="text-neutral-400">No published posts found.</p>
        )}
      </section>
    </main>
  );
}

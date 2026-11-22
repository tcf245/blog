import Link from "next/link";

/** The same header on every page, so moving between pages never shifts it. */
export default function SiteHeader({ back = false }: { back?: boolean }) {
    return (
        <header className="site-header">
            <Link href="/" className="site-name hover:text-neutral-600 transition-colors">
                Eric&apos;s Blog
            </Link>
            {back && (
                <Link href="/" className="site-nav-link group">
                    <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>
                        ←
                    </span>
                    Back
                </Link>
            )}
        </header>
    );
}

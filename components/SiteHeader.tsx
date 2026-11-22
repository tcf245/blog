import Link from "next/link";
import type { Lang } from "@/lib/i18n";
import LangSwitch from "./LangSwitch";

/** The same header on every page, so moving between pages never shifts it. */
export default function SiteHeader({
    lang,
    altHref,
    back = false,
}: {
    lang: Lang;
    altHref: string;
    back?: boolean;
}) {
    const homeHref = `/${lang}`;

    return (
        <header className="site-header">
            <Link href={homeHref} className="site-name hover:text-neutral-600 transition-colors">
                Eric&apos;s Blog
            </Link>
            <div className="site-header-right">
                {back && (
                    <Link href={homeHref} className="site-nav-link group">
                        <span className="group-hover:-translate-x-0.5 transition-transform" aria-hidden>
                            ←
                        </span>
                        Back
                    </Link>
                )}
                <LangSwitch lang={lang} altHref={altHref} />
            </div>
        </header>
    );
}

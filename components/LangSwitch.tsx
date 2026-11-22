"use client";

import Link from "next/link";
import { htmlLangFor, LANG_COOKIE, otherLang, type Lang } from "@/lib/i18n";

const ONE_YEAR_SECONDS = 31536000;

/**
 * Language switch rendered as `EN · 中文`. Remembers explicit clicks in a
 * cookie so future visits to `/` or bare slugs land on the chosen language.
 */
export default function LangSwitch({ lang, altHref }: { lang: Lang; altHref: string }) {
    const target = otherLang(lang);

    const rememberLang = () => {
        document.cookie = `${LANG_COOKIE}=${target}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    };

    const enLabel =
        lang === "en" ? (
            <span className="lang-switch-current" aria-current="true">
                EN
            </span>
        ) : (
            <Link href={altHref} hrefLang={htmlLangFor("en")} onClick={rememberLang}>
                EN
            </Link>
        );

    const zhLabel =
        lang === "zh" ? (
            <span className="lang-switch-current" aria-current="true">
                中文
            </span>
        ) : (
            <Link href={altHref} hrefLang={htmlLangFor("zh")} onClick={rememberLang}>
                中文
            </Link>
        );

    return (
        <nav className="lang-switch" aria-label="Language">
            {enLabel}
            <span className="lang-switch-sep" aria-hidden>
                ·
            </span>
            {zhLabel}
        </nav>
    );
}

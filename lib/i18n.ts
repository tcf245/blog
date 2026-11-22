// Pure i18n helpers. No runtime imports, so `node --test` can load it directly.

export const LANGS = ["en", "zh"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_COOKIE = "lang";

export const isLang = (x: unknown): x is Lang => x === "en" || x === "zh";

export const otherLang = (lang: Lang): Lang => (lang === "en" ? "zh" : "en");

export const htmlLangFor = (lang: Lang): "en" | "zh-CN" => (lang === "zh" ? "zh-CN" : "en");

/**
 * Pick the reader's preferred language: a valid `lang` cookie wins; otherwise
 * walk `Accept-Language` in descending `q` order and return the first `zh*`
 * or `en*` tag, falling back to English.
 */
export const negotiateLang = (
    cookie: string | undefined,
    acceptLanguage: string | null
): Lang => {
    if (isLang(cookie)) return cookie;
    if (!acceptLanguage) return "en";

    const parsed = acceptLanguage
        .split(",")
        .map((entry, index) => {
            const [rawTag, ...params] = entry.split(";");
            const tag = rawTag.trim().toLowerCase();
            let q = 1;
            for (const param of params) {
                const match = /^\s*q\s*=\s*([0-9.]+)\s*$/i.exec(param);
                if (match) {
                    const value = Number(match[1]);
                    q = Number.isFinite(value) ? value : 0;
                }
            }
            return { tag, q, index };
        })
        .filter((item) => item.tag.length > 0 && item.q > 0)
        .sort((a, b) => b.q - a.q || a.index - b.index);

    for (const { tag } of parsed) {
        const primary = tag.split(/[-_]/)[0];
        if (primary === "zh") return "zh";
        if (primary === "en") return "en";
    }

    return "en";
};

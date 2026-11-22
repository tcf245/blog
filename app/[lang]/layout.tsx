import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { htmlLangFor, isLang, LANGS } from "@/lib/i18n";
import { SITE_DESCRIPTION } from "@/lib/site";

// Fonts: system PingFang SC / Hiragino stack (see globals.css). No web font is
// preloaded; Google Sans Code is self-hosted and loads only where code appears.

export const metadata: Metadata = {
    title: {
        default: "Eric's Blog",
        template: "%s — Eric's Blog",
    },
    description: SITE_DESCRIPTION,
};

export function generateStaticParams() {
    return LANGS.map((lang) => ({ lang }));
}

export default async function RootLayout({
    children,
    params,
}: Readonly<{
    children: React.ReactNode;
    params: Promise<{ lang: string }>;
}>) {
    const { lang } = await params;
    if (!isLang(lang)) {
        notFound();
    }

    return (
        <html lang={htmlLangFor(lang)} suppressHydrationWarning>
            <body className="antialiased">{children}</body>
        </html>
    );
}

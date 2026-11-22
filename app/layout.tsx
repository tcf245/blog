import type { Metadata } from "next";
import "./globals.css";
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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="zh-CN" suppressHydrationWarning>
            <body className="antialiased">{children}</body>
        </html>
    );
}

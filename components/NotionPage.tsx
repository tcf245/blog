"use client";

import { NotionRenderer } from "react-notion-x";
import { ExtendedRecordMap } from "notion-types";
import Link from "next/link";
import dynamic from "next/dynamic";

// Core styles
import "react-notion-x/src/styles.css";

// Dynamic imports for improved performance
const Code = dynamic(() =>
    import("react-notion-x/build/third-party/code").then((m) => m.Code)
);
const Collection = dynamic(() =>
    import("react-notion-x/build/third-party/collection").then((m) => m.Collection)
);
const Equation = dynamic(() =>
    import("react-notion-x/build/third-party/equation").then((m) => m.Equation)
);
const Modal = dynamic(
    () => import("react-notion-x/build/third-party/modal").then((m) => m.Modal),
    { ssr: false }
);

interface NotionPageProps {
    recordMap: ExtendedRecordMap;
}

export default function NotionPage({ recordMap }: NotionPageProps) {
    if (!recordMap) {
        return null;
    }

    return (
        <div className="notion-container">
            <NotionRenderer
                recordMap={recordMap}
                fullPage={false}
                darkMode={false}
                disableHeader
                components={{
                    Code,
                    Collection,
                    Equation,
                    Modal,
                    nextLink: Link,
                }}
                // Custom classes to match our minimalist design
                mapPageUrl={(pageId) => `/${pageId.replace(/-/g, "")}`}
            />
            <style jsx global>{`
                .notion {
                    font-family: var(--font-sans) !important;
                    color: var(--color-foreground) !important;
                    caret-color: var(--color-foreground) !important;
                }
                .notion-h1, .notion-h2, .notion-h3 {
                    font-family: var(--font-sans) !important;
                    color: #2C2C2A !important;
                }
                .notion-text {
                    line-height: 1.8 !important;
                }
                /* Full-width page; each block is centred in the reading column */
                .notion-page {
                    padding: 0 !important;
                    width: 100% !important;
                    max-width: none !important;
                }
                .notion-page > *,
                .notion-page-content > * {
                    width: 100%;
                    max-width: 52rem;
                    box-sizing: border-box;
                    margin-left: auto !important;
                    margin-right: auto !important;
                }
                /* Images and diagrams may use the wider shell */
                .notion-page > .notion-asset-wrapper,
                .notion-page-content > .notion-asset-wrapper {
                    max-width: 100% !important;
                    width: 100% !important;
                }
                .notion-asset-wrapper img {
                    border-radius: 6px;
                }
                .notion-asset-caption {
                    text-align: center;
                }
                @media (min-width: 1024px) {
                    .notion-text, .notion-list li {
                        font-size: 17px !important;
                    }
                }
            `}</style>
        </div>
    );
}

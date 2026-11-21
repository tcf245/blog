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
        <div className="post-body">
            <NotionRenderer
                recordMap={recordMap}
                fullPage={false}
                darkMode={false}
                previewImages
                disableHeader
                components={{
                    Code,
                    Collection,
                    Equation,
                    Modal,
                    nextLink: Link,
                }}
                // Styles live in app/globals.css under .post-body
                mapPageUrl={(pageId) => `/${pageId.replace(/-/g, "")}`}
            />
        </div>
    );
}

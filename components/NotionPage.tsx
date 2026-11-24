"use client";

import { NotionRenderer } from "react-notion-x";
import { ExtendedRecordMap } from "notion-types";
import Link from "next/link";
import dynamic from "next/dynamic";
import { mapImageUrl } from "../lib/image-url";

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

// Tall images (phone screenshots) are shown at 60% of the column. react-notion-x's zoom fits an
// image to the viewport height, which makes a tall screenshot smaller, not larger. So a tap on a
// tall image opens the full-resolution file instead, where it can be scrolled and pinch-zoomed
// (Eric, 2026-11-24: 正常浏览小一点，点击才放大). Capture phase runs before the zoom's own listener.
const openTallImage = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    if (target.naturalHeight <= target.naturalWidth * 1.2) return;
    event.preventDefault();
    event.stopPropagation();
    window.open(target.currentSrc || target.src, "_blank", "noopener");
};

export default function NotionPage({ recordMap }: NotionPageProps) {
    if (!recordMap) {
        return null;
    }

    return (
        <div className="post-body" onClickCapture={openTallImage}>
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
                mapImageUrl={mapImageUrl}
            />
        </div>
    );
}

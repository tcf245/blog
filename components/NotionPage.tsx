"use client";

import { useCallback, useEffect, useState } from "react";
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
// tall image opens it in place, wider than in the text and scrollable; a tap or Esc closes it
// (Eric, 2026-11-24: 正常浏览小一点，点击才放大，在当前页面上放大). Capture phase runs before the
// zoom's own listener; wide images keep the zoom.
const isTall = (img: HTMLImageElement) => img.naturalHeight > img.naturalWidth * 1.2;

function TallImageViewer({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
        const overflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = overflow;
            window.removeEventListener("keydown", onKey);
        };
    }, [onClose]);
    return (
        <div className="tall-image-viewer" role="dialog" aria-modal="true" aria-label={alt || "image"} onClick={onClose}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} />
        </div>
    );
}

export default function NotionPage({ recordMap }: NotionPageProps) {
    const [tall, setTall] = useState<{ src: string; alt: string } | null>(null);
    const close = useCallback(() => setTall(null), []);
    const openTall = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        const target = event.target;
        if (!(target instanceof HTMLImageElement) || !isTall(target)) return;
        event.preventDefault();
        event.stopPropagation();
        setTall({ src: target.currentSrc || target.src, alt: target.alt });
    }, []);

    if (!recordMap) {
        return null;
    }

    return (
        <div className="post-body" onClickCapture={openTall}>
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
            {tall && <TallImageViewer src={tall.src} alt={tall.alt} onClose={close} />}
        </div>
    );
}

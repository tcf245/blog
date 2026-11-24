import type { Block } from "notion-types";
import { defaultMapImageUrl } from "notion-utils";
import { isNotionHostedImageUrl } from "./image-proxy.ts";
import { signedS3Url } from "./post-utils.ts";

/**
 * Resolve an image URL for react-notion-x. Notion-hosted files use a stable
 * same-site proxy endpoint so ISR-cached HTML never embeds expiring signed URLs.
 */
export const mapImageUrl = (url: string | undefined, block: Block): string | undefined => {
    if (!url) return undefined;
    if (block?.id && isNotionHostedImageUrl(url)) {
        return `/api/notion-image/${block.id}`;
    }
    if (!block) return signedS3Url(url) ?? url;
    return signedS3Url(url) ?? defaultMapImageUrl(url, block) ?? "";
};

import type { Block } from "notion-types";
import { defaultMapImageUrl } from "notion-utils";
import { signedS3Url } from "./post-utils";

/**
 * Resolve an image URL for react-notion-x. Signed S3 URLs from the official
 * API bypass Notion's /image proxy, which rejects never-web-published pages.
 */
export const mapImageUrl = (url: string | undefined, block: Block): string | undefined => {
    if (!url) return undefined;
    return signedS3Url(url) ?? defaultMapImageUrl(url, block) ?? "";
};

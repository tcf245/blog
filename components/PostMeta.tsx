import { Fragment } from "react";
import { formatDate } from "@/lib/post-utils";

/** Date · CATEGORY · reading time, used on the home page and in posts. */
export default function PostMeta({
    date,
    tags,
    minutes,
}: {
    date: string;
    tags: string[];
    minutes?: number;
}) {
    const parts: React.ReactNode[] = [<time key="date" dateTime={date}>{formatDate(date)}</time>];
    if (tags.length) parts.push(<span key="tags" className="post-meta-tag">{tags.join(", ")}</span>);
    if (minutes) parts.push(<span key="time">{`${minutes} min read`}</span>);

    return (
        <div className="post-meta">
            {parts.map((part, i) => (
                <Fragment key={i}>
                    {i > 0 && <span className="post-meta-sep" aria-hidden>·</span>}
                    {part}
                </Fragment>
            ))}
        </div>
    );
}

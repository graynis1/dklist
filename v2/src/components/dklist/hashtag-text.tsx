import { Fragment } from "react";
import { parseHashtagSegments } from "@/lib/hashtag";

/** Renders inline text with #hashtags colored blue, Facebook-style - plain
 * text (including a bare "#" with nothing after it) stays the surrounding
 * color. Used anywhere a comment/reply/quote body is displayed. */
export function HashtagText({ text }: { text: string }) {
  const segments = parseHashtagSegments(text);
  return (
    <>
      {segments.map((segment, i) => (
        <Fragment key={i}>
          {segment.type === "tag" ? (
            <span className="font-medium text-blue-600 dark:text-blue-400">#{segment.value}</span>
          ) : (
            segment.value
          )}
        </Fragment>
      ))}
    </>
  );
}

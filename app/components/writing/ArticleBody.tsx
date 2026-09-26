import type { Root } from "hast";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Tweet } from "react-tweet";

import { parseEmbed, threadsFrame, youtubeFrame, type Embed } from "../../../cms/embeds";
import AudioPlayer from "./AudioPlayer";

/*
 * The body of an article, rendered at build time. The Markdown's hast tree
 * becomes React here, so an embed is a component rather than a string: a post
 * on X is fetched and drawn by react-tweet during the build (no X script ever
 * loads for readers), Threads and YouTube get lazy iframes. Images are marked
 * for the zoom the page's enhancement island adds.
 */

function EmbedBlock(props: Record<string, unknown>) {
  let embed: Embed;
  try {
    const data: unknown = JSON.parse(String(props["data-embed"]));
    if (!data || typeof data !== "object" || !("url" in data) || typeof data.url !== "string") return null;
    const parsed = parseEmbed(data.url);
    if (!parsed) return null;
    embed = parsed;
  } catch {
    return null;
  }
  if (embed.kind === "x") {
    return (
      <div className="embed embed-x" data-theme="light">
        <Tweet id={embed.id} />
      </div>
    );
  }
  if (embed.kind === "threads") {
    return (
      <div className="embed embed-threads">
        <iframe src={threadsFrame(embed)} title={`Threads post by @${embed.user}`} loading="lazy" scrolling="no" allowFullScreen />
        <a className="embed-source" href={embed.url} target="_blank" rel="noreferrer">
          View on Threads
        </a>
      </div>
    );
  }
  return (
    <div className="embed embed-youtube">
      <iframe
        src={youtubeFrame(embed)}
        title="YouTube video"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

function AudioBlock(props: Record<string, unknown>) {
  const src = String(props["data-src"] ?? "");
  const title = String(props["data-title"] ?? "");
  if (!src) return null;
  return (
    <figure className="article-audio">
      <AudioPlayer src={src} title={title || undefined} />
      {title ? <figcaption>{title}</figcaption> : null}
    </figure>
  );
}

// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
const ZoomableImage = (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} data-zoom="" />;

export default function ArticleBody({ tree }: { tree: Root }) {
  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: { "x-embed": EmbedBlock, "x-audio": AudioBlock, img: ZoomableImage } as unknown as Partial<Components>,
  });
}

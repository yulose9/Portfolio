import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Tweet } from "react-tweet";

import { threadsFrame, youtubeFrame, type Embed } from "../../../cms/embeds";
import { markdownTree } from "../../lib/writing";

/*
 * The body of an article, rendered at build time. The Markdown's hast tree
 * becomes React here, so an embed is a component rather than a string: a post
 * on X is fetched and drawn by react-tweet during the build (no X script ever
 * loads for readers), Threads and YouTube get lazy iframes.
 */

function EmbedBlock(props: Record<string, unknown>) {
  let embed: Embed;
  try {
    embed = JSON.parse(String(props["data-embed"])) as Embed;
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
        <iframe
          src={threadsFrame(embed)}
          title={`Threads post by @${embed.user}`}
          loading="lazy"
          scrolling="no"
          allowFullScreen
        />
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

export default async function ArticleBody({ markdown }: { markdown: string }) {
  const tree = await markdownTree(markdown);
  return toJsxRuntime(tree, {
    Fragment,
    jsx,
    jsxs,
    components: { "x-embed": EmbedBlock } as unknown as Partial<Components>,
  });
}

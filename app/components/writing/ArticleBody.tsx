import type { Element, ElementContent, Root } from "hast";
import { toJsxRuntime, type Components } from "hast-util-to-jsx-runtime";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Tweet } from "react-tweet";

import { isChartType, isNumeric } from "../../../cms/blocks";
import { parseEmbed, threadsFrame, youtubeFrame, type Embed } from "../../../cms/embeds";
import CodeBlock from "../code/CodeBlock";
import CodeTabs from "../code/CodeTabs";
import AudioPlayer from "./AudioPlayer";
import Chart from "./Chart";
import ChoicePoll from "./ChoicePoll";
import Citation from "./Citation";
import DataTable, { type DataTableCell, type DataTableProps } from "./DataTable";
import { MentionSpan } from "./DateMention";
import VideoPlayer from "./VideoPlayer";
import { Glimpse, type GlimpseData } from "../kit/inputs/glimpse";

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
const ZoomableImage = (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} data-zoom={props.className?.split(" ").some(c => c === "inline-logo-image" || c === "heading-icon-image") ? undefined : ""} />;

/* ── The newer blocks (cms/blocks.ts): each a small client island ─────── */

type P = Record<string, unknown> & { children?: React.ReactNode };
const str = (v: unknown) => (typeof v === "string" ? v : "");
const parsed = <T,>(v: unknown, fallback: T): T => {
  try {
    return typeof v === "string" ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};

const CodeFrame = (p: P) => (
  <CodeBlock language={str(p["data-language"])} title={str(p["data-title"])} lineNumbers={p["data-line-numbers"] !== undefined} bare={p["data-bare"] !== undefined}>
    {p.children}
  </CodeBlock>
);
const CodeTabsBlock = (p: P) => <CodeTabs tabs={parsed(p["data-tabs"], [])}>{p.children}</CodeTabs>;
function ChartBlock(p: P) {
  const type = p["data-chart"];
  if (!isChartType(type)) return <>{p.children}</>;
  return <Chart type={type} title={str(p["data-title"])} rows={parsed<string[][]>(p["data-chart-data"], [])}>{p.children}</Chart>;
}
function PollBlock(p: P) {
  const options = parsed<string[]>(p["data-options"], []).map(String);
  if (options.length < 2) return <>{p.children}</>;
  return <ChoicePoll id={str(p["data-poll"])} question={str(p["data-question"])} options={options} />;
}
const CiteBlock = (p: P) => (
  <Citation index={str(p["data-index"])} href={str(p["data-href"])} title={str(p["data-title"])} site={str(p["data-site"])} snippet={str(p["data-snippet"])} id={str(p.id) || undefined} />
);
function VideoBlock(p: P) {
  return <VideoPlayer {...(p as React.VideoHTMLAttributes<HTMLVideoElement>)} />;
}

const textOf = (n: ElementContent): string => (n.type === "text" ? n.value : n.type === "element" ? n.children.map(textOf).join("") : "");
const kids = (n: Element, tag: string) => n.children.filter((c): c is Element => c.type === "element" && c.tagName === tag);

/** A "data" table's rows, as cells already rendered plus their text for sorting. */
function dataTableProps(table: Element, render: (root: Root) => React.ReactNode): DataTableProps | null {
  const rows = [...kids(table, "thead"), ...kids(table, "tbody")].flatMap((s) => kids(s, "tr"));
  if (!rows.length) return null;
  const cells = (tr: Element): DataTableCell[] =>
    tr.children
      .filter((c): c is Element => c.type === "element" && (c.tagName === "th" || c.tagName === "td"))
      .map((c) => ({ node: render({ type: "root", children: c.children }), key: textOf(c).trim(), align: str(c.properties.align) || undefined }));
  const [head, ...body] = rows.map(cells);
  const numeric = head.map((_, i) => body.length > 0 && body.every((r) => !r[i]?.key || isNumeric(r[i].key)) && body.some((r) => r[i]?.key));
  return { head, rows: body, numeric };
}

/**
 * `components` overrides individual tags: the admin's preview swaps in its
 * own embed and audio stand-ins, and gets every other block exactly as the
 * published page renders it.
 */
export default function ArticleBody({
  tree,
  components,
  previews,
}: {
  tree: Root;
  components?: Record<string, unknown>;
  /** Hover previews for links, by path ("/writing/slug"): the post's title, standfirst and cover. */
  previews?: Record<string, GlimpseData>;
}) {
  // A link to another post gets a glimpse of it on hover or focus. Section
  // anchors, mentions and citations keep their own behaviour.
  const LinkBlock = (p: P) => {
    const href = str(p.href);
    const cls = str(p.className);
    const data = previews?.[href.split("#")[0].replace(/\/$/, "")];
    if (!data || /heading-anchor|page-mention|cite/.test(cls)) return <a {...(p as React.AnchorHTMLAttributes<HTMLAnchorElement>)} />;
    return (
      <Glimpse href={href} data={data} className={cls || undefined}>
        {p.children}
      </Glimpse>
    );
  };
  const tables: DataTableProps[] = [];
  const DataTableBlock = (p: P) => {
    const props = tables[Number(p["data-index"])];
    return props ? <DataTable {...props} /> : <div className="table-wrap">{p.children}</div>;
  };
  const options = {
    Fragment,
    jsx,
    jsxs,
    components: {
      "x-embed": EmbedBlock, "x-audio": AudioBlock, img: ZoomableImage, span: MentionSpan,
      "x-code": CodeFrame, "x-code-tabs": CodeTabsBlock, "x-chart": ChartBlock, "x-poll": PollBlock,
      "x-cite": CiteBlock, "x-data-table": DataTableBlock, video: VideoBlock,
      ...(previews ? { a: LinkBlock } : {}),
      ...components,
    } as unknown as Partial<Components>,
  };
  const render = (root: Root) => toJsxRuntime(root, options);
  const collect = (n: Root | Element) => {
    for (const c of n.children) {
      if (c.type !== "element") continue;
      if (c.tagName === "x-data-table") {
        const table = kids(c, "table")[0];
        const props = table ? dataTableProps(table, render) : null;
        if (props) {
          c.properties.dataIndex = String(tables.length);
          tables.push(props);
        }
      } else collect(c);
    }
  };
  collect(tree);
  return render(tree);
}

import type { Draft } from "./format";
import { editorContent, type EditorNode } from "./editor-document";
import { normalizeSearch } from "./search";

export type Reference = { target: string; blockId?: string; snippet: string };
export type DocumentIndex = Pick<
  Draft,
  "id" | "title" | "dek" | "status" | "dirty" | "updatedAt" | "icon"
> & {
  version: 2;
  searchText?:string;
  searchTitle?:string;
  tags: string[];
  parentId: string | null;
  text: string;
  references: Reference[];
  blocks: { id: string; text: string }[];
};
export const readable = (md: string) =>
  md
    .replace(/```[^\n]*\n/g, " ")
    .replace(/!?(\[([^\]]*)\])\([^)]*\)/g, "$2")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_~`|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
export function indexDocument(d: Draft): DocumentIndex {
  const references: Reference[] = [];
  const blocks: DocumentIndex["blocks"] = [];
  const text = (n: EditorNode): string =>
    n.text ??
    (n.type === "hardBreak"
      ? "\n"
      : n.type === "mention"
        ? String(n.attrs?.label ?? n.attrs?.date ?? "")
        : (n.content ?? [])
            .map(text)
            .join(n.content?.some((c) => c.attrs?.blockId) ? "\n" : ""));
  const root = editorContent(d);
  const visit = (n: EditorNode, owner?: string, context = "") => {
    const id = typeof n.attrs?.blockId === "string" ? n.attrs.blockId : owner;
    const snippet = n.attrs?.blockId
      ? text(n).replace(/\s+/g, " ").trim().slice(0, 240)
      : context;
    if (n.attrs?.blockId && !n.content?.some((c) => c.attrs?.blockId))
      blocks.push({
        id: String(n.attrs.blockId),
        text: text(n).replace(/\s+/g, " ").trim(),
      });
    if (
      n.type === "mention" &&
      n.attrs?.kind === "page" &&
      /^[a-z0-9]{12}$/.test(String(n.attrs.id))
    )
      references.push({ target: String(n.attrs.id), blockId: id, snippet });
    for (const mark of n.marks ?? []) {
      const match = /^#page=([a-z0-9]{12})$/.exec(
        String(mark.attrs?.href ?? ""),
      );
      if (match) references.push({ target: match[1], blockId: id, snippet });
    }
    n.content?.forEach((child) => visit(child, id, snippet));
  };
  if (root) visit(root);
  // Also covers legacy Markdown and manually authored page references.
  for (const match of d.body.matchAll(/#page=([a-z0-9]{12})/g)) {
    if (!references.some((r) => r.target === match[1]))
      references.push({
        target: match[1],
        snippet: readable(
          d.body.slice(Math.max(0, match.index! - 100), match.index! + 160),
        ),
      });
  }
  const bodyText=root ? text(root).replace(/\s+/g," ").trim() : readable(d.body);
  return {
    version: 2,
    searchText:normalizeSearch(`${d.title} ${d.dek} ${bodyText}`),
    searchTitle:normalizeSearch(d.title),
    tags: d.tags,
    parentId: d.parentId ?? null,
    id: d.id,
    title: d.title,
    dek: d.dek,
    icon: d.icon,
    status: d.status,
    dirty: d.dirty,
    updatedAt: d.updatedAt,
    text: bodyText,
    references,
    blocks,
  };
}

export type CollectionRules = {
  query?: string;
  tag?: string;
  status?: "draft" | "scheduled" | "published";
  pinned?: boolean;
  sort?: "updated" | "title" | "scheduled";
  include?: string[];
};
export type ResearchItem = {
  sourceFingerprint?: string;
  lastCheckedAt?: string;
  id: string;
  kind: "collection" | "template" | "capture" | "excerpt" | "review";
  title: string;
  body: string;
  url?: string;
  pageId?: string;
  blockId?: string;
  sourceUpdatedAt?: string;
  resolved?: boolean;
  rules?: CollectionRules;
  createdAt: string;
  updatedAt: string;
};
export function cleanResearchItem(
  value: unknown,
  id: string,
  now: string,
  previous?: ResearchItem,
): ResearchItem {
  const v = value as ResearchItem;
  if (
    !v ||
    !["collection", "template", "capture", "excerpt", "review"].includes(v.kind)
  )
    throw new Error("Choose a valid research item type.");
  const title = typeof v.title === "string" ? v.title.trim().slice(0, 200) : "";
  if (!title) throw new Error("Enter a title.");
  if (typeof v.body !== "string" || v.body.length > 100000)
    throw new Error("Research content must be at most 100,000 characters.");
  if (v.pageId && !/^[a-z0-9]{12}$/.test(v.pageId))
    throw new Error("Invalid source page.");
  if (v.blockId && !/^[\w-]{8,80}$/.test(v.blockId))
    throw new Error("Invalid source block.");
  if (v.url) {
    const u = new URL(v.url);
    if (
      !/^https?:$/.test(u.protocol) ||
      u.username ||
      u.password ||
      v.url.length > 2048
    )
      throw new Error("Use a valid web address.");
  }
  const rules: CollectionRules = {};
  if (v.rules) {
    if (v.rules.query) rules.query = String(v.rules.query).slice(0, 100);
    if (v.rules.tag) rules.tag = String(v.rules.tag).slice(0, 80);
    if (["draft", "scheduled", "published"].includes(v.rules.status ?? ""))
      rules.status = v.rules.status;
    if (v.rules.pinned === true) rules.pinned = true;
    if (["updated", "title", "scheduled"].includes(v.rules.sort ?? ""))
      rules.sort = v.rules.sort;
    if (Array.isArray(v.rules.include))
      rules.include = [
        ...new Set(
          v.rules.include.filter(
            (x) => typeof x === "string" && /^[a-z0-9]{12}$/.test(x),
          ),
        ),
      ].slice(0, 500);
  }
  return {
    id,
    kind: v.kind,
    sourceFingerprint:previous?.sourceFingerprint,
    lastCheckedAt:typeof v.lastCheckedAt==="string"&&Number.isFinite(Date.parse(v.lastCheckedAt))?new Date(v.lastCheckedAt).toISOString():previous?.lastCheckedAt,
    title,
    body: v.body,
    url: v.url || undefined,
    pageId: v.pageId || undefined,
    blockId: v.blockId || undefined,
    sourceUpdatedAt:
      typeof v.sourceUpdatedAt === "string"
        ? v.sourceUpdatedAt.slice(0, 30)
        : undefined,
    resolved: v.resolved === true,
    rules: v.kind === "collection" ? rules : undefined,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}
export function inCollection(
  post: {
    id: string;
    title: string;
    dek: string;
    tags: string[];
    status: string;
    pinned?: boolean;
    trashedAt?: string | null;
  },
  rules: CollectionRules,
) {
  if (post.trashedAt) return false;
  if (rules.include?.includes(post.id)) return true;
  return (
    (!rules.query ||
      `${post.title} ${post.dek}`
        .toLowerCase()
        .includes(rules.query.toLowerCase())) &&
    (!rules.tag || post.tags.includes(rules.tag)) &&
    (!rules.status || post.status === rules.status) &&
    (!rules.pinned || post.pinned)
  );
}

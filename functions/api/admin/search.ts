import { fail, json, type AdminFunction } from "../../../cms/server/http";
import { researchIndex } from "../../../cms/server/research";
import { searchDocuments } from "../../../cms/search";

/*
 * Full-text search across every post: titles, standfirsts and bodies, drafts
 * and live alike. Bodies are searched as the words you'd read, with Markdown
 * syntax stripped, so "hard part" finds **hard** part. Each hit says which
 * occurrence it is, and the editor jumps straight to that one.
 */

/** Markdown → the words on the page, near enough for searching. */
export function plainText(md: string): string {
  return md
    .replace(/```[^\n]*\n/g, "")
    .replace(/```/g, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<\/?(?:p|div|br|h[1-6]|li|tr|blockquote)\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, e => ({"&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;": "'", "&nbsp;":" "})[e]!)
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+(\[[ xX]\]\s+)?/gm, "")
    .replace(/\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/g, "")
    .replace(/(\*\*|__|==|~~|`)/g, "")
    .replace(/(^|\s)[*_](\S)/g, "$1$2")
    .replace(/(\S)[*_](\s|$)/g, "$1$2")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ").trim();
}

export const onRequestGet: AdminFunction = async ({ env, request }) => {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return fail("Type at least two characters.");
  if (q.length > 100) return fail("That search is too long.");

  const params = new URL(request.url).searchParams;
  const status=params.get("status") || "", tag=params.get("tag") || "", root=params.get("root") || "";
  if (status && !["draft","scheduled","published"].includes(status)) return fail("Invalid search status.");
  if (tag.length>80 || (root && !/^[a-z0-9]{12}$/.test(root))) return fail("Invalid search scope.");
  const all = await researchIndex(env);
  const results = searchDocuments(all,q,{status,tag,root,mode:params.get("mode")==="words"?"words":"phrase"});
  return json({q,results,indexVersion:2});
};

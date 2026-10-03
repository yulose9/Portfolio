import fs from "node:fs";
import path from "node:path";
import { parsePost, type Post } from "../../cms/format";
import { markdownToTree } from "../../cms/render";
import { pagedPosts } from "./writing";
export function publishedProjects(): Post[] {
  const directory = path.join(process.cwd(), "content/projects");
  if (!fs.existsSync(directory)) return [];
  const all = fs.readdirSync(directory).filter(name => name.endsWith(".md")).map(name => {
    const post = parsePost(fs.readFileSync(path.join(directory, name), "utf8"));
    if (`${post.slug}.md` !== name || post.kind !== "project") throw new Error(`Invalid published project: ${name}`);
    return post;
  }).filter(post => post.page && Date.parse(post.publishedAt) <= Date.now());
  return all.filter(post => {
    const seen = new Set([post.id]); let parent = post.parentId;
    while (parent) { if (seen.has(parent)) return false; seen.add(parent); const found = all.find(p => p.id === parent); if (!found) return false; parent = found.parentId; }
    return true;
  }).sort((a, b) => (a.project?.order ?? 0) - (b.project?.order ?? 0) || a.title.localeCompare(b.title));
}
export async function projectTree(post: Post) {
  const pages = [...publishedProjects(), ...pagedPosts()];
  return markdownToTree(post.body, [], id => pages.find(p => p.id === id));
}

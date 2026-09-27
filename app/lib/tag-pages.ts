import fs from "node:fs";
import path from "node:path";
import { tagPage, validTagSlug } from "../../cms/tag-pages";

export function readTagPage(slug:string) {
  if(!validTagSlug(slug))return tagPage(null);
  const file=path.join(process.cwd(),"content","tags",`${slug}.json`);
  if(!fs.existsSync(file))return tagPage(null);
  return tagPage(JSON.parse(fs.readFileSync(file,"utf8")));
}

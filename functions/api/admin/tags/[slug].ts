import { tagPage, validTagSlug } from "../../../../cms/tag-pages";
import { readFile, commit, GitHubConflictError } from "../../../../cms/server/github";
import { fail, json, param, readJson, type AdminFunction } from "../../../../cms/server/http";

export const onRequestGet: AdminFunction<"slug"> = async ({env,params}) => {
  const slug=param(params.slug);
  if(!validTagSlug(slug))return fail("Invalid tag.");
  const raw=await readFile(env,`content/tags/${slug}.json`);
  return json({page:tagPage(raw?JSON.parse(raw):null)});
};
export const onRequestPut: AdminFunction<"slug"> = async ({env,params,request}) => {
  const slug=param(params.slug);
  if(!validTagSlug(slug))return fail("Invalid tag.");
  const input=await readJson<Record<string,unknown>>(request);
  if(typeof input.title!=="string" || input.title.length>100 || typeof input.description!=="string" || input.description.length>2000)return fail("Use a title of up to 100 characters and a description of up to 2,000 characters.");
  const path=`content/tags/${slug}.json`;
  const raw=await readFile(env,path);
  const previous=tagPage(raw?JSON.parse(raw):null);
  if(input.base!==previous.updatedAt)return fail("This tag page changed in another session. Reopen it before saving.",409);
  const page=tagPage({...input,updatedAt:new Date().toISOString()});
  try { await commit(env,`Update tag page: ${slug}`,[{path,content:JSON.stringify(page,null,2)+"\n"}],[{path,content:raw}]); }
  catch(error){if(error instanceof GitHubConflictError)return fail(error.message,409);throw error;}
  return json({page});
};

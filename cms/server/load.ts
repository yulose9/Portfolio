import { postToDraft, type Draft } from "../format";
import { HttpError, ID } from "./http";
import { livePosts, type CmsEnv } from "./publish";
import { getDraft, putDraft } from "./store";

/**
 * The working copy for `id`. A post that only exists in git (written by hand,
 * or from before the admin) is adopted into R2 the first time it's opened.
 */
export async function loadDraft(env: CmsEnv, id: string): Promise<Draft> {
  if (!ID.test(id)) throw new HttpError("This post doesn’t exist or was deleted forever.", 400);
  const draft = await getDraft(env, id);
  if (draft) return draft;
  const post = (await livePosts(env)).find((p) => p.id === id);
  if (!post) throw new HttpError("This post doesn’t exist or was deleted forever.", 404);
  const adopted = postToDraft(post);
  await putDraft(env, adopted);
  return adopted;
}

import { getTweet } from "react-tweet/api";

import { fail, json, type AdminFunction } from "../../../cms/server/http";
import { parseEmbed } from "../../../cms/embeds";

/*
 * What the editor needs to preview an embed. For a post on X, the tweet's
 * data from X's public syndication endpoint (the same one react-tweet uses
 * when the site builds), so the card in the editor is the card readers get.
 * Threads and YouTube preview as their own iframes and need nothing here.
 */
export const onRequestGet: AdminFunction = async ({ request }) => {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  const embed = parseEmbed(url);
  if (!embed) return fail("That link isn't something that can be embedded.");
  if (embed.kind !== "x") return json({ embed });
  try {
    const tweet = await getTweet(embed.id);
    if (!tweet) return fail("That post couldn't be found. It may be private or deleted.", 404);
    return json({ embed, tweet });
  } catch {
    return fail("X didn't answer. The embed will still show on the site.", 502);
  }
};

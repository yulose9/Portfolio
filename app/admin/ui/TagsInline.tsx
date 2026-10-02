"use client";

import { useEffect, useState } from "react";

import { TagsInput } from "../../components/kit/inputs/multi-select-tags";
import { tagTint } from "../../components/writing/Tag";
import { api } from "./api";

/*
 * Tags as Notion shows properties: every tag as a coloured pill under the
 * title, × to remove, a field to add one with suggestions from the tags
 * already in use (so "Agents" doesn't become "agents" and "AI agents" by
 * accident). The pills drag to reorder, smoothly, and the keyboard can lift
 * and move them too: Space to lift, arrows to move, Space to drop.
 */

let known: Promise<string[]> | null = null;
const knownTags = () =>
  (known ??= api
    .list()
    .then(({ posts }) => [...new Set(posts.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b)))
    .catch(() => ((known = null), [])));

export default function TagsInline({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    void knownTags().then((all) => live && setSuggestions(all));
    return () => {
      live = false;
    };
  }, []);

  return (
    <TagsInput
      className="tags-inline"
      label="Tags"
      value={tags}
      onChange={onChange}
      suggestions={suggestions}
      max={8}
      maxLength={40}
      placeholder="Add a tag"
      // The same tint the tag wears on the site, so the editor shows what readers see.
      tagProps={(tag) => ({ "data-tint": tagTint(tag) })}
    />
  );
}

"use client";

import { Plus, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { tagTint } from "../../components/writing/Tag";
import { api } from "./api";

/*
 * Tags as Notion shows properties: every tag as a coloured pill under the
 * title, × to remove, "+" to add one with suggestions from the tags already
 * in use (so "Agents" doesn't become "agents" and "AI agents" by accident).
 */

let known: Promise<string[]> | null = null;
const knownTags = () =>
  (known ??= api
    .list()
    .then(({ posts }) => [...new Set(posts.flatMap((p) => p.tags))].sort((a, b) => a.localeCompare(b)))
    .catch(() => ((known = null), [])));

export default function TagsInline({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  // Enter takes a suggestion only after you've arrowed to it.
  const [navigated, setNavigated] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!adding) return;
    input.current?.focus();
    let live = true;
    void knownTags().then((all) => live && setSuggestions(all));
    return () => {
      live = false;
    };
  }, [adding]);

  const matches = suggestions.filter((t) => !tags.includes(t) && (!value || t.toLowerCase().includes(value.toLowerCase()))).slice(0, 6);

  const add = (raw: string) => {
    const tag = raw.trim().replace(/,$/, "").slice(0, 40);
    if (!tag) return;
    const existing = suggestions.find((t) => t.toLowerCase() === tag.toLowerCase()) ?? tag;
    if (!tags.some((t) => t.toLowerCase() === existing.toLowerCase()) && tags.length < 8) onChange([...tags, existing]);
    setValue("");
    setActive(0);
    setNavigated(false);
  };

  return (
    <div className="tags-inline" role="group" aria-label="Tags">
      {tags.map((t) => (
        <span key={t} className="tag tag-edit" data-tint={tagTint(t)}>
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))}>
            <X size={10} weight="bold" />
          </button>
        </span>
      ))}
      {adding ? (
        <span className="tag-add-field">
          <input
            ref={input}
            value={value}
            placeholder="Add a tag"
            aria-label="Add a tag"
            onChange={(e) => {
              setValue(e.target.value);
              setActive(0);
              setNavigated(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                add(navigated && matches[active] ? matches[active] : value);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setNavigated(true);
                setActive((i) => Math.min(matches.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setNavigated(true);
                setActive((i) => Math.max(0, i - 1));
              } else if (e.key === "Tab" && matches[active]) {
                e.preventDefault();
                add(matches[active]);
              } else if (e.key === "Escape") {
                setAdding(false);
                setValue("");
              } else if (e.key === "Backspace" && !value && tags.length) {
                onChange(tags.slice(0, -1));
              }
            }}
            onBlur={() => {
              if (value) add(value);
              window.setTimeout(() => setAdding(false), 120);
            }}
          />
          {matches.length ? (
            <span className="tag-suggest" role="listbox">
              {matches.map((m, i) => (
                <button key={m} type="button" role="option" aria-selected={i === active} className="tag" data-tint={tagTint(m)} onMouseDown={(e) => e.preventDefault()} onClick={() => add(m)}>
                  {m}
                </button>
              ))}
            </span>
          ) : null}
        </span>
      ) : (
        <button type="button" className="tag-add" onClick={() => setAdding(true)} disabled={tags.length >= 8}>
          <Plus size={11} weight="bold" aria-hidden="true" />
          {tags.length ? "Tag" : "Add tags"}
        </button>
      )}
    </div>
  );
}

"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";
import { Fragment, useEffect, useId, useMemo, useRef, useState } from "react";

import { api, type SearchResult } from "./api";
import { relative, StatusDot, statusLabel } from "./bits";
import { Fluent } from "./extensions/emoji";
import { keys } from "./menu";
import { allCommands, matches, type Command } from "./registry";
import AdminSelect from "./AdminSelect";

/*
 * ⌘K: search every post, drafts and live, by title, standfirst and full text.
 * Each result shows the passages that match; choosing one opens the post with
 * find-in-page already on that passage.
 */

export type Jump = { id: string; q: string; n: number; block?:string };

function Snippet({ text, start, length }: { text: string; start: number; length: number }) {
  return (
    <span className="search-snippet">
      {text.slice(0, start)}
      <mark>{text.slice(start, start + length)}</mark>
      {text.slice(start + length)}
    </span>
  );
}

/*
 * It's also Obsidian's command palette: with nothing typed it lists actions
 * (New post; in the editor Publish, Find, History, focus and typewriter
 * modes…); typing filters them alongside the posts, and a leading ">" shows
 * actions only.
 */
export default function SearchPalette({
  open,
  onClose,
  onJump,
  initialQuery = "",
}: {
  open: boolean;
  initialQuery?: string;
  onClose: () => void;
  onJump: (j: Jump) => void;
}) {
  // What's registered right now; read again after a toggle so its switch flips.
  const [commands, setCommands] = useState<Command[]>([]);
  const refresh = () => setCommands(allCommands());
  const [active, setActive] = useState(0);
  const [mode,setMode]=useState("phrase");
  const [status,setStatus]=useState("");
  const [tag,setTag]=useState("");
  const [scope,setScope]=useState("");
  const [query, setQuery] = useState("");
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCommands(allCommands());
      setQuery(initialQuery);
      setActive(0);
    }
  }
  const [error,setError]=useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const listId = useId();
  const optionId = (i: number) => `${listId}-opt-${i}`;

  const [searchKey,setSearchKey]=useState("");
  const nextKey=`${open}:${query}:${mode}:${status}:${tag}:${scope}`;
  if(searchKey!==nextKey){setSearchKey(nextKey);setResults(null);setError("");}

  // Debounced, and a newer query aborts the one in flight.
  useEffect(() => {
    if(!open)return;
    const q = query.trim();
    // Too short to search (or a ">" command query): the list shows actions instead.
    if (q.length < 2 || q.startsWith(">")) return;
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      api
        .search(q, ctrl.signal, {mode:mode as "phrase"|"words",status,tag,root:scope ? new URLSearchParams(window.location.search).get("post") ?? "" : ""})
        .then((r) => {
          if(ctrl.signal.aborted)return;
          setResults(r.results);
          setActive(0);
        })
        .catch(error => {if(!ctrl.signal.aborted){setResults([]);setError(error instanceof Error?error.message:"Search failed. Try again.");}});
    }, 160);
    return () => {
      window.clearTimeout(t);
      ctrl.abort();
    };
  }, [query,open,mode,status,tag,scope]);

  const commandQuery = query.trim().replace(/^>\s*/, "").toLowerCase();
  const onlyCommands = query.trim().startsWith(">");
  const shownCommands = useMemo(() => {
    const list = commands.filter((c) => matches(c, commandQuery));
    // Unfiltered, grouped in a steady order; filtered, the closest titles first.
    return commandQuery ? list.sort((a, b) => Number(!a.title.toLowerCase().startsWith(commandQuery)) - Number(!b.title.toLowerCase().startsWith(commandQuery))) : list;
  }, [commands, commandQuery]);

  // One flat list of choices: matching actions, then each post and its passages.
  const choices = useMemo(
    () => [
      ...shownCommands.map((c) => ({ key: `cmd:${c.id}`, command: c, jump: null, result: null, hit: null })),
      ...(onlyCommands || query.trim().length < 2 ? [] : results ?? []).flatMap((r) => [
        { key: `${r.id}`, command: null, jump: { id: r.id, q: query.trim(), n: 0 }, result: r, hit: null },
        ...r.hits
          .filter((h) => h.field === "body")
          .map((h) => ({ key: `${r.id}:${h.occurrence}`, command: null, jump: { id: r.id, q: h.snippet.slice(h.start,h.start+h.length), n: h.occurrence,block:h.blockId }, result: r, hit: h })),
      ]),
    ],
    [results, query, shownCommands, onlyCommands]
  );

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const at = Math.min(active, Math.max(0, choices.length - 1));

  const go = (i: number) => {
    const c = choices[i];
    if (!c) return;
    if (c.command?.disabled) return;
    // A setting flips in place, and the palette stays open to flip another.
    if (c.command && c.command.checked !== undefined) {
      c.command.run();
      window.setTimeout(refresh, 40);
      return;
    }
    onClose();
    if (c.command) c.command.run();
    else if (c.jump) onJump(c.jump);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChangeComplete={(isOpen) => !isOpen && setQuery("")}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="sheet-backdrop" data-variant="center" />
        <Dialog.Popup className="palette" aria-label="Search posts and actions">
          <div className="palette-input">
            <MagnifyingGlass size={16} aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // A new query is a new list: the highlight starts at its top.
                setActive(0);
              }}
              placeholder="Search words or phrases across all writing"
              aria-label="Search posts and actions"
              role="combobox"
              aria-expanded={choices.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={choices.length ? optionId(at) : undefined}
              onKeyDown={(e) => {
                const last = choices.length - 1;
                if (last < 0) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive(at >= last ? 0 : at + 1);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive(at <= 0 ? last : at - 1);
                } else if (e.key === "PageDown") {
                  e.preventDefault();
                  setActive(Math.min(last, at + 8));
                } else if (e.key === "PageUp") {
                  e.preventDefault();
                  setActive(Math.max(0, at - 8));
                } else if ((e.metaKey || e.ctrlKey) && (e.key === "Home" || e.key === "End")) {
                  e.preventDefault();
                  setActive(e.key === "Home" ? 0 : last);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  go(at);
                }
              }}
            />
            <kbd className="admin-kbd">Esc</kbd>
          </div>
          <p className="search-scope">All writing · Titles, descriptions and article text <span>Type &gt; for actions</span></p>
          <div className="writing-search-filters">
            <AdminSelect label="Match" value={mode} onValueChange={setMode} options={[{value:"phrase",label:"Exact phrase"},{value:"words",label:"All words"}]}/>
            <AdminSelect label="Status" value={status} onValueChange={setStatus} options={[{value:"",label:"Any status"},...['draft','scheduled','published'].map(value=>({value,label:value}))]}/>
            <AdminSelect label="Scope" value={scope} onValueChange={setScope} options={[{value:"",label:"All pages"},{value:"page",label:"Current page and children",disabled:typeof window==="undefined" || !new URLSearchParams(window.location.search).get("post")}]}/>
            <label className="field">Tag<input aria-label="Search tag" value={tag} onChange={e=>setTag(e.target.value)} placeholder="Any tag" maxLength={80}/></label>
          </div>
          {error ? <p className="palette-empty" role="alert">{error}</p> : null}
          <div ref={list} id={listId} className="palette-results" role="listbox" aria-label="Results">
            {!choices.length && query.trim().length >= 2 && results === null && !onlyCommands ? (
              <p className="palette-empty">Searching…</p>
            ) : !choices.length ? (
              <p className="palette-empty">{query.trim().length < 2 ? "Type to search every draft and published post." : `Nothing matches “${query.trim()}”.`}</p>
            ) : (
              choices.map((c, i) =>
                c.command ? (
                  <Fragment key={c.key}>
                    {!commandQuery && c.command.group !== choices[i - 1]?.command?.group ? <p className="palette-group" aria-hidden="true">{c.command.group}</p> : null}
                    <button
                      type="button"
                      id={optionId(i)}
                      tabIndex={-1}
                      role="option"
                      aria-checked={c.command.checked}
                      aria-selected={i === at}
                      aria-disabled={c.command.disabled ? true : undefined}
                      data-index={i}
                      className="palette-command"
                      onMouseMove={() => i !== at && setActive(i)}
                      onClick={() => go(i)}
                      title={c.command.disabled}
                    >
                      <span className="palette-command-icon" aria-hidden="true">
                        {c.command.icon}
                      </span>
                      <span className="palette-command-title">
                        {c.command.title}
                        {commandQuery ? <span className="palette-command-group">{c.command.group}</span> : null}
                      </span>
                      {c.command.disabled ? <span className="palette-command-why">{c.command.disabled}</span> : null}
                      {c.command.keys ? <kbd className="admin-kbd">{keys(c.command.keys)}</kbd> : null}
                      {c.command.checked !== undefined ? (
                        // Kobra's switch, drawn: the row itself is the control.
                        <span className="kit-switch t-toggle" data-on={c.command.checked ? "true" : "false"} data-checked={c.command.checked || undefined} aria-hidden="true">
                          <span className="kit-switch-thumb t-toggle-thumb" />
                        </span>
                      ) : null}
                    </button>
                  </Fragment>
                ) : c.hit ? (
                  <button
                    key={c.key}
                    type="button"
                    id={optionId(i)}
                    tabIndex={-1}
                    role="option"
                    aria-selected={i === at}
                    data-index={i}
                    className="palette-hit"
                    onMouseMove={() => i !== at && setActive(i)}
                    onClick={() => go(i)}
                  >
                    <Snippet text={c.hit.snippet} start={c.hit.start} length={c.hit.length} />
                  </button>
                ) : c.result ? (
                  <button
                    key={c.key}
                    type="button"
                    id={optionId(i)}
                    tabIndex={-1}
                    role="option"
                    aria-selected={i === at}
                    data-index={i}
                    className="palette-post"
                    onMouseMove={() => i !== at && setActive(i)}
                    onClick={() => go(i)}
                  >
                    <span className="palette-post-icon">{c.result.icon ? <Fluent emoji={c.result.icon} size={18} /> : null}</span>
                    <span className="palette-post-title">{c.result.title.trim() || "Untitled"}</span>
                    <span className="palette-post-meta">
                      <StatusDot status={c.result.status} dirty={c.result.dirty} />
                      {statusLabel({ ...c.result, publishAt: null })} · {c.result.total} {c.result.total === 1 ? "match" : "matches"} · {relative(c.result.updatedAt)}
                    </span>
                  </button>
                ) : null
              )
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

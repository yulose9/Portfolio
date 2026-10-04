"use client";

import { ArrowRight, Briefcase, FileText, MagnifyingGlass, TextAa, Terminal } from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";
import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

import { api, getApiWorkspace, type SearchResult } from "./api";
import { relative, StatusDot, statusLabel } from "./bits";
import { DESTINATION_ICON } from "./ControlShell";
import { Fluent } from "./extensions/emoji";
import { keys } from "./menu";
import { allCommands, matches, type Command } from "./registry";
import { DESTINATION_LABEL, DESTINATIONS, recentContext, requestView, useRecents, VIEWS, type Destination, type RecentItem } from "./shell-nav";
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

type Page = { id: Destination; view?: string; title: string; context: string };
type Tip = { id: string; title: string; context: string; icon: ReactNode; run: () => void };
type Choice = { key: string; section: string } & (
  | { kind: "recent"; item: RecentItem }
  | { kind: "page"; page: Page }
  | { kind: "command"; command: Command }
  | { kind: "result"; result: SearchResult; jump: Jump }
  | { kind: "hit"; result: SearchResult; hit: SearchResult["hits"][number]; jump: Jump }
  | { kind: "tip"; tip: Tip }
);

const CI = { size: 16, "aria-hidden": true } as const;
const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
const hasAll = (hay: string, q: string) => words(q).every((w) => hay.toLowerCase().includes(w));
const EMOJI = /\p{Extended_Pictographic}/u;
/** The registry's "Go to" and "View" are the shell's actions. */
const sectionOf = (c: Command) => (c.group === "Go to" || c.group === "View" ? "Actions" : c.group);

function recentIcon(item: RecentItem) {
  if (item.icon && EMOJI.test(item.icon)) return <Fluent emoji={item.icon} size={16} />;
  if (item.kind === "page") {
    const Glyph = DESTINATION_ICON[item.id as Destination];
    return <Glyph {...CI} />;
  }
  return item.kind === "project" ? <Briefcase {...CI} /> : <FileText {...CI} />;
}

/*
 * It's also the shell's quick search, after Cloudflare's: with nothing typed
 * it lists Recents, the admin's Pages, the registered actions (New post; in
 * the editor Publish, Find, History, focus and typewriter modes…) and a few
 * search tips. Typing filters all of them and searches the posts; a leading
 * ">" shows actions only.
 */
export default function SearchPalette({
  open,
  onClose,
  onJump,
  onNavigate,
  onOpenRecent,
  initialQuery = "",
}: {
  open: boolean;
  initialQuery?: string;
  onClose: () => void;
  onJump: (j: Jump) => void;
  onNavigate: (destination: Destination) => void;
  onOpenRecent: (item: RecentItem) => void;
}) {
  // What's registered right now; read again after a toggle so its switch flips.
  const [commands, setCommands] = useState<Command[]>([]);
  const refresh = () => setCommands(allCommands());
  const recents = useRecents();
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
  const input = useRef<HTMLInputElement>(null);
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

  const trimmed = query.trim();
  const commandQuery = trimmed.replace(/^>\s*/, "").toLowerCase();
  const onlyCommands = trimmed.startsWith(">");
  const searching = !onlyCommands && trimmed.length >= 2;
  const workspace = getApiWorkspace();
  const shownCommands = useMemo(() => {
    const list = commands.filter((c) => matches(c, commandQuery));
    // Unfiltered, grouped in a steady order; filtered, the closest titles first.
    return commandQuery ? list.sort((a, b) => Number(!a.title.toLowerCase().startsWith(commandQuery)) - Number(!b.title.toLowerCase().startsWith(commandQuery))) : list;
  }, [commands, commandQuery]);

  // One flat list of choices, in sections: what's selected, Recents, Pages,
  // the matching posts and their passages, actions, then search tips.
  const choices = useMemo<Choice[]>(() => {
    const out: Choice[] = [];
    const selected = shownCommands.filter((c) => c.group === "Selected" || c.group === "Selection");
    const actions = shownCommands.filter((c) => c.group !== "Selected" && c.group !== "Selection");
    // A section stays together even when a filtered sort interleaves groups.
    const order = [...new Set(actions.map(sectionOf))];
    for (const c of selected) out.push({ key: `cmd:${c.id}`, section: c.group, kind: "command", command: c });
    if (!onlyCommands) {
      for (const item of recents)
        if (!trimmed || hasAll(`${item.title} ${recentContext(item)}`, trimmed)) out.push({ key: `recent:${item.kind}:${item.id}`, section: "Recents", kind: "recent", item });
      const pages: Page[] = DESTINATIONS.map((id) => ({ id, title: DESTINATION_LABEL[id], context: "Page" }));
      // Typed, the views of Writing and Projects are pages too.
      if (trimmed)
        for (const scope of ["writing", "projects"] as const)
          for (const view of VIEWS[scope]) pages.push({ id: scope, view: view.id, title: view.label, context: DESTINATION_LABEL[scope] });
      for (const page of pages)
        if (!trimmed || hasAll(`${page.title} ${page.context}`, trimmed)) out.push({ key: `page:${page.id}:${page.view ?? ""}`, section: "Pages", kind: "page", page });
    }
    if (searching)
      for (const r of results ?? []) {
        const section = workspace === "projects" ? "Projects" : "Posts";
        out.push({ key: `${r.id}`, section, kind: "result", result: r, jump: { id: r.id, q: trimmed, n: 0 } });
        for (const h of r.hits.filter((h) => h.field === "body"))
          out.push({ key: `${r.id}:${h.occurrence}`, section, kind: "hit", result: r, hit: h, jump: { id: r.id, q: h.snippet.slice(h.start, h.start + h.length), n: h.occurrence, block: h.blockId } });
      }
    for (const section of order)
      for (const c of actions) if (sectionOf(c) === section) out.push({ key: `cmd:${c.id}`, section, kind: "command", command: c });
    if (!trimmed) {
      const tips: Tip[] = [
        { id: "actions", title: "Show actions only", context: "Start with >", icon: <Terminal {...CI} />, run: () => setQuery("> ") },
        mode === "phrase"
          ? { id: "words", title: "Match all words, in any order", context: "Instead of the exact phrase", icon: <TextAa {...CI} />, run: () => setMode("words") }
          : { id: "phrase", title: "Match the exact phrase", context: "Instead of all words", icon: <TextAa {...CI} />, run: () => setMode("phrase") },
      ];
      for (const tip of tips) out.push({ key: `tip:${tip.id}`, section: "Search tips", kind: "tip", tip });
    }
    return out;
  }, [results, trimmed, shownCommands, onlyCommands, searching, recents, workspace, mode]);

  useEffect(() => {
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const at = Math.min(active, Math.max(0, choices.length - 1));

  const go = (i: number) => {
    const c = choices[i];
    if (!c) return;
    if (c.kind === "tip") {
      c.tip.run();
      setActive(0);
      input.current?.focus();
      return;
    }
    if (c.kind === "command") {
      if (c.command.disabled) return;
      // A setting flips in place, and the palette stays open to flip another.
      if (c.command.checked !== undefined) {
        c.command.run();
        window.setTimeout(refresh, 40);
        return;
      }
      onClose();
      c.command.run();
      return;
    }
    onClose();
    if (c.kind === "recent") onOpenRecent(c.item);
    else if (c.kind === "page") {
      if (c.page.view && (c.page.id === "writing" || c.page.id === "projects")) requestView(c.page.id, c.page.view);
      onNavigate(c.page.id);
    } else onJump(c.jump);
  };

  const option = (i: number, className: string, children: ReactNode, extra: Record<string, unknown> = {}) => (
    <button
      type="button"
      id={optionId(i)}
      tabIndex={-1}
      role="option"
      aria-selected={i === at}
      data-index={i}
      className={className}
      onMouseMove={() => i !== at && setActive(i)}
      onClick={() => go(i)}
      {...extra}
    >
      {children}
    </button>
  );

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
            <MagnifyingGlass size={18} aria-hidden="true" />
            <input
              ref={input}
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                // A new query is a new list: the highlight starts at its top.
                setActive(0);
              }}
              placeholder="Search pages, posts and actions…"
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
          {searching ? (
            <>
              <p className="search-scope">{workspace === "projects" ? "All projects" : "All writing"} · Titles, descriptions and article text <span>Type &gt; for actions</span></p>
              <div className="writing-search-filters">
                <AdminSelect label="Match" value={mode} onValueChange={setMode} options={[{value:"phrase",label:"Exact phrase"},{value:"words",label:"All words"}]}/>
                <AdminSelect label="Status" value={status} onValueChange={setStatus} options={[{value:"",label:"Any status"},...['draft','scheduled','published'].map(value=>({value,label:value}))]}/>
                <AdminSelect label="Scope" value={scope} onValueChange={setScope} options={[{value:"",label:"All pages"},{value:"page",label:"Current page and children",disabled:typeof window==="undefined" || !new URLSearchParams(window.location.search).get("post")}]}/>
                <label className="field">Tag<input aria-label="Search tag" value={tag} onChange={e=>setTag(e.target.value)} placeholder="Any tag" maxLength={80}/></label>
              </div>
            </>
          ) : null}
          {error ? <p className="palette-empty" role="alert">{error}</p> : null}
          <div ref={list} id={listId} className="palette-results" role="listbox" aria-label="Results">
            {!choices.length ? (
              <p className="palette-empty">
                {searching && results === null ? "Searching…" : trimmed.length < 2 && !onlyCommands ? "Type to search every draft and published post." : `Nothing matches “${trimmed}”.`}
              </p>
            ) : (
              choices.map((c, i) => (
                <Fragment key={c.key}>
                  {c.section !== choices[i - 1]?.section ? (
                    <p className="palette-group" aria-hidden="true">
                      {c.section}
                    </p>
                  ) : null}
                  {c.kind === "command"
                    ? option(
                        i,
                        "palette-command",
                        <>
                          <span className="palette-command-icon" aria-hidden="true">
                            {c.command.icon}
                          </span>
                          <span className="palette-command-title">
                            {c.command.title}
                            {commandQuery && sectionOf(c.command) !== c.command.group ? <span className="palette-context">{c.command.group}</span> : null}
                          </span>
                          {c.command.disabled ? <span className="palette-command-why">{c.command.disabled}</span> : null}
                          {c.command.keys ? <kbd className="admin-kbd">{keys(c.command.keys)}</kbd> : null}
                          {c.command.checked !== undefined ? (
                            // Kobra's switch, drawn: the row itself is the control.
                            <span className="kit-switch t-toggle" data-on={c.command.checked ? "true" : "false"} data-checked={c.command.checked || undefined} aria-hidden="true">
                              <span className="kit-switch-thumb t-toggle-thumb" />
                            </span>
                          ) : null}
                        </>,
                        { "aria-checked": c.command.checked, "aria-disabled": c.command.disabled ? true : undefined, title: c.command.disabled },
                      )
                    : c.kind === "recent"
                      ? option(
                          i,
                          "palette-command palette-recent",
                          <>
                            <span className="palette-command-icon" aria-hidden="true">
                              {recentIcon(c.item)}
                            </span>
                            <span className="palette-command-title">
                              <span className="palette-title-text">{c.item.title}</span>
                              <span className="palette-context">{recentContext(c.item)}</span>
                            </span>
                            <ArrowRight className="palette-arrow" size={14} aria-hidden="true" />
                          </>,
                        )
                      : c.kind === "page"
                        ? option(
                            i,
                            "palette-command",
                            <>
                              <span className="palette-command-icon" aria-hidden="true">
                                {(() => {
                                  const Glyph = DESTINATION_ICON[c.page.id];
                                  return <Glyph {...CI} />;
                                })()}
                              </span>
                              <span className="palette-command-title">
                                {c.page.title}
                                <span className="palette-context">{c.page.context}</span>
                              </span>
                            </>,
                          )
                        : c.kind === "tip"
                          ? option(
                              i,
                              "palette-command palette-tip",
                              <>
                                <span className="palette-command-icon" aria-hidden="true">
                                  {c.tip.icon}
                                </span>
                                <span className="palette-command-title">
                                  {c.tip.title}
                                  <span className="palette-context">{c.tip.context}</span>
                                </span>
                              </>,
                            )
                          : c.kind === "hit"
                            ? option(i, "palette-hit", <Snippet text={c.hit.snippet} start={c.hit.start} length={c.hit.length} />)
                            : option(
                                i,
                                "palette-post",
                                <>
                                  <span className="palette-post-icon">{c.result.icon ? <Fluent emoji={c.result.icon} size={18} /> : null}</span>
                                  <span className="palette-post-title">{c.result.title.trim() || "Untitled"}</span>
                                  <span className="palette-post-meta">
                                    <StatusDot status={c.result.status} dirty={c.result.dirty} />
                                    {statusLabel({ ...c.result, publishAt: null })} · {c.result.total} {c.result.total === 1 ? "match" : "matches"} · {relative(c.result.updatedAt)}
                                  </span>
                                </>,
                              )}
                </Fragment>
              ))
            )}
            {choices.length && searching && results === null ? <p className="palette-searching">Searching {workspace === "projects" ? "projects" : "posts"}…</p> : null}
          </div>
          <div className="palette-footer" aria-hidden="true">
            <span>
              <kbd className="admin-kbd">↑</kbd>
              <kbd className="admin-kbd">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="admin-kbd">↵</kbd> to select
            </span>
            <span>
              <kbd className="admin-kbd">Esc</kbd> to close
            </span>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

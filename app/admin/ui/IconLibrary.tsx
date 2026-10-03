"use client";

import { MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { TEXT_COLORS } from "../../../cms/inline";
import { Spinner } from "../../components/kit/spinner";
import { createTooltipHandle, GlidingTooltip, TooltipTrigger } from "../../components/kit/tooltip";
import AdminSelect from "./AdminSelect";
import { onRadioKeys } from "./bits";
import {
  ALL_SETS,
  cachedJson,
  collectionUrl,
  defaultStyle,
  filterNames,
  ICON_SETS,
  iconImage,
  iconLabel,
  iconSet,
  loadIcons,
  persistIcon,
  readCollection,
  recentIcons,
  rememberIcon,
  searchUrl,
  splitIcon,
  styleOf,
  toHex,
  type Collection,
  type CollectionResponse,
  type RecentIcon,
} from "./iconify";
import { uploadInlineLogo } from "./media";
import { beginPendingWork } from "./session";

/*
 * The icon library: thousands of icons from the open sets Iconify indexes
 * (Phosphor, Fluent, Material, Lucide, Tabler, emoji and brand sets…), by set,
 * style and category, or searched across all of them. Picking one copies it
 * into the media library (see iconify.ts), so `onPick` receives our own URL.
 *
 * Pages of 120 load as the grid scrolls, each drawn from one bulk request per
 * set through the admin's Iconify proxy rather than 120 image requests, which
 * Iconify throttles. One Tab stop for the grid, arrows to move, Enter to
 * pick; a shared tooltip names the icon under the pointer.
 */

const PAGE = 120;
const TEXT = "text";
const SET_OPTIONS = [{ value: ALL_SETS, label: "All sets" }, ...ICON_SETS.map((s) => ({ value: s.prefix, label: s.name }))];
const LAST_SET = "admin-icon-set";
const tips = createTooltipHandle();

/** "Text": the ink the admin is drawn in, which changes with the theme. */
let inkSeen = { colour: "", hex: null as string | null };
function readInk(): string | null {
  const colour = getComputedStyle(document.body).color;
  if (colour !== inkSeen.colour) inkSeen = { colour, hex: toHex(colour) };
  return inkSeen.hex;
}
function watchTheme(change: () => void) {
  const watch = new MutationObserver(change);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", change);
  return () => {
    watch.disconnect();
    media.removeEventListener("change", change);
  };
}

type Listing = { state: "idle" | "loading" | "error"; ids: string[]; error?: string };

function storedSet(): string {
  try {
    const set = localStorage.getItem(LAST_SET);
    return set && (set === ALL_SETS || iconSet(set)) ? set : "ph";
  } catch {
    return "ph";
  }
}

export default function IconLibrary({ onPick, onBusy }: { onPick: (src: string) => void; onBusy?: (busy: boolean) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [prefix, setPrefix] = useState(storedSet);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  // Async results are kept with the request they answer, so a stale one
  // simply doesn't match and the view falls back to "loading".
  const [loaded, setLoaded] = useState<{ prefix: string; collection?: Collection; error?: string } | null>(null);
  const [found, setFound] = useState<{ key: string; ids?: string[]; error?: string } | null>(null);
  const [filter, setFilter] = useState<{ prefix: string; style?: string; category?: string | null }>({ prefix: "" });
  const [paging, setPaging] = useState({ key: "", pages: 1 });
  const [tone, setTone] = useState(TEXT);
  const [recent, setRecent] = useState<RecentIcon[]>(recentIcons);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  // Bumped when icon data arrives, so the cells redraw from it.
  const [, setDrawn] = useState(0);
  const [drawError, setDrawError] = useState("");
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const ink = useSyncExternalStore(watchTheme, readInk, () => null);

  const set = iconSet(prefix);
  const mono = prefix === ALL_SETS || Boolean(set?.mono);
  const colour = tone === TEXT ? ink : tone;
  const collection = loaded?.prefix === prefix ? (loaded.collection ?? null) : null;
  const ownFilter = filter.prefix === prefix ? filter : { prefix };
  const style = ownFilter.style ?? (collection ? defaultStyle(collection.styles) : "");
  const category = ownFilter.category ?? null;
  const searchKey = debounced ? `${prefix}|${debounced}` : "";

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  // The set's listing: names, categories and styles.
  useEffect(() => {
    if (prefix === ALL_SETS) return;
    let live = true;
    void cachedJson<CollectionResponse>(collectionUrl(prefix))
      .then((data) => live && setLoaded({ prefix, collection: readCollection(data) }))
      .catch((e: unknown) => live && setLoaded({ prefix, error: e instanceof Error ? e.message : "Couldn't reach Iconify." }));
    return () => {
      live = false;
    };
  }, [prefix, retry]);

  // Search results, for the set or for every set.
  useEffect(() => {
    if (!searchKey) return;
    let live = true;
    void cachedJson<{ icons?: string[] }>(searchUrl(debounced, prefix))
      .then((data) => live && setFound({ key: searchKey, ids: (data.icons ?? []).filter((id) => splitIcon(id)) }))
      .catch((e: unknown) => live && setFound({ key: searchKey, error: e instanceof Error ? e.message : "Couldn't reach Iconify." }));
    return () => {
      live = false;
    };
  }, [searchKey, debounced, prefix, retry]);

  // What the grid shows: the set browsed, or search results in its style and category.
  const listing = useMemo<Listing>(() => {
    if (prefix !== ALL_SETS && loaded?.prefix === prefix && loaded.error) return { state: "error", ids: [], error: loaded.error };
    if (!debounced) {
      if (prefix === ALL_SETS) return { state: "idle", ids: [] };
      return collection ? { state: "idle", ids: filterNames(collection, style, category).map((n) => `${prefix}:${n}`) } : { state: "loading", ids: [] };
    }
    if (found?.key !== searchKey || (prefix !== ALL_SETS && !collection)) return { state: "loading", ids: [] };
    if (found.error) return { state: "error", ids: [], error: found.error };
    let ids = found.ids ?? [];
    if (collection) {
      const inCategory = category ? collection.categories.find((c) => c.label === category)?.names : null;
      const styled = Object.keys(collection.styles).length > 0;
      ids = ids.filter((id) => {
        const name = splitIcon(id)!.name;
        return (!inCategory || inCategory.has(name)) && (!styled || styleOf(name, collection.styles) === style);
      });
    }
    return { state: "idle", ids };
  }, [prefix, loaded, debounced, collection, style, category, found, searchKey]);

  // A new listing starts at its first page, scrolled to the top.
  const listKey = `${prefix}|${debounced}|${style}|${category ?? ""}`;
  const pages = paging.key === listKey ? paging.pages : 1;
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [listKey]);

  // The next page loads as the end of the grid scrolls into view.
  const total = listing.ids.length;
  useEffect(() => {
    const end = sentinel.current;
    if (!end || pages * PAGE >= total) return;
    const watch = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setPaging({ key: listKey, pages: pages + 1 });
      },
      { root: scroller.current, rootMargin: "160px" },
    );
    watch.observe(end);
    return () => watch.disconnect();
  }, [pages, total, listKey]);

  const shown = useMemo(() => listing.ids.slice(0, pages * PAGE), [listing.ids, pages]);
  const setStyle = (next: string) => setFilter({ prefix, style: next, category });
  const setCategory = (next: string | null) => setFilter({ prefix, style, category: next });

  const choose = async (id: string, pickColour: string | null) => {
    if (pending) return;
    const finish = beginPendingWork();
    setPending(id);
    setError("");
    onBusy?.(true);
    try {
      const src = await persistIcon(id, pickColour, uploadInlineLogo);
      const entry = { id, colour: iconSet(splitIcon(id)?.prefix ?? "")?.mono ? pickColour : null };
      rememberIcon(entry);
      setRecent(recentIcons());
      onPick(src);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that icon.");
    } finally {
      setPending(null);
      onBusy?.(false);
      finish();
    }
  };

  const changeSet = (next: string) => {
    setPrefix(next);
    try {
      localStorage.setItem(LAST_SET, next);
    } catch {
      /* private mode */
    }
  };

  const styles = collection ? Object.entries(collection.styles) : [];
  const categories = collection?.categories ?? [];
  const browsingAll = prefix === ALL_SETS && !debounced;
  const showRecent = !debounced && !category && recent.length > 0;

  // The drawings for what's on screen: one bulk request per set per page.
  const wanted = useMemo(() => [...(showRecent ? recent.map((r) => r.id) : []), ...shown].join(","), [showRecent, recent, shown]);
  useEffect(() => {
    if (!wanted) return;
    let live = true;
    void loadIcons(wanted.split(","))
      .then(() => live && setDrawError(""))
      .catch((e: unknown) => live && setDrawError(e instanceof Error ? e.message : "Some icons couldn't be loaded."))
      .finally(() => live && setDrawn((n) => n + 1));
    return () => {
      live = false;
    };
  }, [wanted, retry]);

  const tryAgain = () => {
    setLoaded(null);
    setFound(null);
    setDrawError("");
    setBroken(new Set());
    setRetry((r) => r + 1);
  };

  const cell = (id: string, index: number, pickColour: string | null, group: string) => {
    const icon = splitIcon(id)!;
    const iconSetOf = iconSet(icon.prefix);
    const label = iconLabel(icon.name, collection?.prefix === icon.prefix ? collection.styles : iconSetOf?.styles);
    const tip = prefix === ALL_SETS || group === "recent" ? `${label} (${iconSetOf?.name ?? icon.prefix})` : label;
    const image = iconImage(id, pickColour);
    return (
      <TooltipTrigger
        key={`${group}:${id}:${pickColour ?? ""}`}
        handle={tips}
        payload={tip}
        delay={350}
        render={
          <button
            type="button"
            className="icon-cell"
            tabIndex={index === 0 ? 0 : -1}
            aria-label={tip}
            aria-busy={pending === id || undefined}
            disabled={Boolean(pending) && pending !== id}
            onClick={() => void choose(id, pickColour)}
          />
        }
      >
        {image && !broken.has(image) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" width={22} height={22} decoding="async" draggable={false} onError={() => setBroken((b) => new Set(b).add(image))} />
        ) : (
          <span className="icon-cell-placeholder" data-state={image === undefined ? "loading" : "missing"} aria-hidden="true" />
        )}
        {pending === id ? <Spinner className="icon-cell-spinner" aria-hidden="true" /> : null}
      </TooltipTrigger>
    );
  };

  return (
    <div className="icon-library" ref={root}>
      <div className="icon-library-top">
        <label className="icon-library-search">
          <MagnifyingGlass size={15} aria-hidden="true" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowDown") return;
              const first = root.current?.querySelector<HTMLButtonElement>(".icon-grid .icon-cell");
              if (!first) return;
              e.preventDefault();
              first.focus();
            }}
            placeholder={prefix === ALL_SETS ? "Search every set" : `Search ${set?.name ?? "icons"}`}
            aria-label="Search icons"
            spellCheck={false}
          />
        </label>
        <AdminSelect className="icon-library-set" label="Icon set" hideLabel value={prefix} onValueChange={changeSet} options={SET_OPTIONS} />
      </div>

      {styles.length > 1 || categories.length ? (
        <div className="icon-library-filters">
          {styles.length > 1 ? (
            <div className="icon-chips" role="radiogroup" aria-label="Style" onKeyDown={onRadioKeys}>
              {styles.map(([suffix, name]) => (
                <button key={suffix || "plain"} type="button" role="radio" aria-checked={style === suffix} tabIndex={style === suffix ? 0 : -1} className="icon-chip" onClick={() => setStyle(suffix)}>
                  {name.replace(/ \d+x\d+$/, "")}
                </button>
              ))}
            </div>
          ) : null}
          {categories.length ? (
            <div className="icon-chips" role="radiogroup" aria-label="Category" onKeyDown={onRadioKeys}>
              <button type="button" role="radio" aria-checked={!category} tabIndex={!category ? 0 : -1} className="icon-chip" onClick={() => setCategory(null)}>
                All
              </button>
              {categories.map((c) => (
                <button key={c.label} type="button" role="radio" aria-checked={category === c.label} tabIndex={category === c.label ? 0 : -1} className="icon-chip" onClick={() => setCategory(c.label)}>
                  {c.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="icon-library-scroll" ref={scroller} data-lenis-prevent>
        {showRecent ? (
          <section className="icon-section">
            <p className="icon-section-title">Recent</p>
            <div className="icon-grid" role="group" aria-label="Recent icons" onKeyDown={onGridKeys}>
              {recent.map((r, i) => cell(r.id, i, r.colour, "recent"))}
            </div>
          </section>
        ) : null}
        <section className="icon-section">
          {showRecent && !browsingAll ? <p className="icon-section-title">{category ?? set?.name}</p> : null}
          {listing.state === "error" ? (
            <div className="icon-empty">
              <p>{listing.error}</p>
              <button type="button" className="admin-button" onClick={tryAgain}>
                Try again
              </button>
            </div>
          ) : browsingAll ? (
            <p className="icon-empty">Type to search {ICON_SETS.length} sets at once, for example “rocket” or “github”.</p>
          ) : listing.state === "loading" ? (
            <p className="icon-empty" role="status">
              <Spinner aria-hidden="true" /> {debounced ? "Searching…" : `Loading ${set?.name ?? "icons"}…`}
            </p>
          ) : shown.length ? (
            <>
              {drawError ? (
                <p className="icon-grid-note" role="status">
                  {drawError}
                  <button type="button" className="icon-link" onClick={tryAgain}>
                    Try again
                  </button>
                </p>
              ) : null}
              <div className="icon-grid" role="group" aria-label={debounced ? `Icons matching ${debounced}` : `${set?.name ?? ""} icons`} onKeyDown={onGridKeys}>
                {shown.map((id, i) => cell(id, i, colour, "main"))}
              </div>
            </>
          ) : (
            <p className="icon-empty">
              {debounced ? `No icons in ${prefix === ALL_SETS ? "any set" : (set?.name ?? "this set")} match “${debounced}”.` : "This style has no icons here. Try another style."}
              {debounced && prefix !== ALL_SETS ? (
                <>
                  {" "}
                  <button type="button" className="icon-link" onClick={() => changeSet(ALL_SETS)}>
                    Search all sets
                  </button>
                </>
              ) : null}
            </p>
          )}
          <div ref={sentinel} aria-hidden="true" />
        </section>
      </div>

      {error ? (
        <p role="alert" className="field-error icon-library-error">
          {error}
        </p>
      ) : null}

      <div className="icon-library-foot">
        <p className="icon-library-credit">
          {prefix === ALL_SETS ? (debounced ? `${total} results` : "Icons from Iconify") : set ? `${set.name}, ${set.licence}${total && !debounced ? `, ${total.toLocaleString()} icons` : ""}` : null}
        </p>
        {mono ? (
          <div className="icon-tones" role="radiogroup" aria-label="Icon colour" onKeyDown={onRadioKeys}>
            {[[TEXT, "Text colour"] as const, ...TEXT_COLORS.map(([name, hex]) => [hex, name] as const)].map(([value, name]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={tone === value}
                tabIndex={tone === value ? 0 : -1}
                className="icon-tone"
                style={value === TEXT ? undefined : ({ "--tone": value } as React.CSSProperties)}
                aria-label={name}
                title={name}
                onClick={() => setTone(value)}
              />
            ))}
          </div>
        ) : null}
      </div>
      <GlidingTooltip handle={tips} side="top" />
    </div>
  );
}

/** Arrow keys inside an icon grid, counted from the layout; Home and End for the ends. */
function onGridKeys(event: React.KeyboardEvent<HTMLElement>) {
  const cells = [...event.currentTarget.querySelectorAll<HTMLButtonElement>(".icon-cell")];
  const at = cells.indexOf(document.activeElement as HTMLButtonElement);
  if (at < 0) return;
  const top = cells[0].offsetTop;
  const wrap = cells.findIndex((c) => c.offsetTop !== top);
  const columns = Math.max(1, wrap === -1 ? cells.length : wrap);
  const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
  let next = at;
  if (event.key in move) next = at + move[event.key];
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = cells.length - 1;
  else return;
  event.preventDefault();
  if (next < 0 || next >= cells.length) return;
  cells[at].tabIndex = -1;
  cells[next].tabIndex = 0;
  cells[next].focus();
}

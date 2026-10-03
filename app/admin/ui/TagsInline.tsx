"use client";

import { Combobox } from "@base-ui/react/combobox";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Check, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { tagTint } from "../../components/writing/Tag";
import { playSound } from "../../components/ui/sound";
import { api } from "./api";

/*
 * Tags as Notion shows properties: every tag as a tinted pill under the
 * title. Fewer than three, and the empty places up to three show as dashed
 * ghost tags; three or more, and one small "+" ghost follows them. Any ghost
 * opens a picker anchored to it: a search, every tag already in use with its
 * tint and how many posts carry it (so "Agents" doesn't become "agents" and
 * "AI agents" by accident), and "Create" for a new one. Checking adds a tag,
 * unchecking removes it.
 *
 * The pills drag to reorder (@hello-pangea/dnd: Space lifts, arrows move,
 * Space drops, Escape puts it back, all announced), Alt+Arrow nudges one place
 * without lifting, and Backspace or Delete on a focused pill removes it.
 *
 * The row is one line that scrolls sideways: the drag library measures a list
 * along one axis, and a wrapped row would drop pills into the wrong slot.
 */

const MAX = 8;
const MAX_LENGTH = 40;
/** How many places the row shows, filled or ghost, before it falls back to one "+". */
const SLOTS = 3;
const CREATE = "\u0000create:";
const fold = (s: string) => s.trim().toLocaleLowerCase();

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SLIDE = { type: "spring", duration: 0.3, bounce: 0 } as const;
const INSTANT = { duration: 0 } as const;

/** Every tag in use, with how many live posts carry it. */
let known: Promise<Map<string, number>> | null = null;
const knownTags = () =>
  (known ??= api
    .list()
    .then(({ posts }) => {
      const counts = new Map<string, number>();
      for (const p of posts) if (!p.trashedAt) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
      return counts;
    })
    .catch(() => ((known = null), new Map<string, number>())));

export default function TagsInline({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const id = useId();
  const still = useReducedMotion();
  const row = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const handles = useRef(new Map<string, HTMLElement>());
  const [counts, setCounts] = useState<Map<string, number>>(() => new Map());
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  // Off while a pill is dragged and for the drop's own render: the drag
  // library moves pills with transforms, and a layout animation would fight it.
  const [dragging, setDragging] = useState(false);
  // Pills already on the page when it opened don't animate in.
  const ready = useRef(false);
  useEffect(() => {
    ready.current = true;
  }, []);

  useEffect(() => {
    let live = true;
    void knownTags().then((all) => live && setCounts(all));
    return () => {
      live = false;
    };
  }, []);

  const full = tags.length >= MAX;

  const items = useMemo(() => {
    const seen = new Set<string>();
    const all = [...tags, ...[...counts.keys()].sort((a, b) => a.localeCompare(b))].filter((t) => {
      const k = fold(t);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const q = fold(query);
    const matches = q ? all.filter((t) => fold(t).includes(q)) : all;
    return q && !seen.has(q) && !full ? [...matches, CREATE + query.trim().slice(0, MAX_LENGTH)] : matches;
  }, [tags, counts, query, full]);

  const blocked = () => {
    playSound("blocked");
    setStatus(`Up to ${MAX} tags.`);
  };

  const add = (raw: string) => {
    const tag = raw.trim().slice(0, MAX_LENGTH);
    if (!tag || tags.some((t) => fold(t) === fold(tag))) return;
    if (full) return blocked();
    onChange([...tags, tag]);
    setStatus(`${tag} added.`);
  };

  const firstGhost = () => row.current?.querySelector<HTMLElement>(".tag-ghost");

  const remove = (tag: string) => {
    const i = tags.indexOf(tag);
    const next = tags.filter((t) => t !== tag);
    onChange(next);
    setStatus(`${tag} removed.`);
    // Focus goes to the neighbour, or to the ghost when it was the last pill.
    requestAnimationFrame(() => {
      const neighbour = next[Math.min(i, next.length - 1)];
      (neighbour ? handles.current.get(neighbour) : firstGhost())?.focus();
    });
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= tags.length || from === to) return;
    const next = [...tags];
    const [tag] = next.splice(from, 1);
    next.splice(to, 0, tag);
    onChange(next);
    setStatus(`${tag} moved to position ${to + 1} of ${next.length}.`);
    requestAnimationFrame(() => handles.current.get(tag)?.focus());
  };

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (destination) move(source.index, destination.index);
    requestAnimationFrame(() => setDragging(false));
  };

  const onChipKeys = (e: KeyboardEvent<HTMLElement>, tag: string, index: number) => {
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      move(index, index + (e.key === "ArrowLeft" ? -1 : 1));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(tag);
    }
  };

  const openFrom = (el: HTMLElement) => {
    setAnchor(el);
    setOpen(true);
  };

  const ghosts = tags.length < SLOTS ? SLOTS - tags.length : 1;
  const ghostLabel = full ? "Edit tags" : "Add a tag";

  // A pill arrives with a short blur-scale; the pieces that stay slide over.
  const arrive = still ? INSTANT : { duration: 0.2, ease: EASE_OUT, layout: SLIDE };

  return (
    <div ref={row} className="tags-inline" data-slot="tags">
      {tags.length ? (
        <DragDropContext onDragStart={() => setDragging(true)} onDragEnd={onDragEnd}>
          <Droppable droppableId={`${id}-tags`} direction="horizontal">
            {(drop) => (
              <ul ref={drop.innerRef} {...drop.droppableProps} className="ki-tags-chips tags-inline-chips" aria-label={`Tags, ${tags.length} of ${MAX}`}>
                {tags.map((tag, index) => (
                  <Draggable key={tag} draggableId={`${id}-${tag}`} index={index}>
                    {(drag, snapshot) => (
                      <li ref={drag.innerRef} {...drag.draggableProps} className="tags-inline-item">
                        <motion.div
                          className="ki-tag"
                          data-tint={tagTint(tag)}
                          data-dragging={snapshot.isDragging || undefined}
                          layout={still || dragging ? false : "position"}
                          initial={ready.current && !still ? { opacity: 0, scale: 0.9, filter: "blur(4px)" } : false}
                          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                          transition={arrive}
                        >
                          <span
                            {...drag.dragHandleProps}
                            ref={(el) => {
                              if (el) handles.current.set(tag, el);
                              else handles.current.delete(tag);
                            }}
                            className="ki-tag-label"
                            aria-label={`${tag}, ${index + 1} of ${tags.length}`}
                            aria-roledescription="Draggable tag"
                            title="Drag, or press Space to lift, to reorder. Delete removes it."
                            onKeyDown={(e) => onChipKeys(e, tag, index)}
                          >
                            {tag}
                          </span>
                          <button type="button" className="ki-tag-remove" aria-label={`Remove ${tag}`} onClick={() => remove(tag)}>
                            <X size={11} weight="bold" aria-hidden="true" />
                          </button>
                        </motion.div>
                      </li>
                    )}
                  </Draggable>
                ))}
                {drop.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      ) : null}

      <AnimatePresence initial={false} mode="popLayout">
        {Array.from({ length: ghosts }, (_, i) => (
          <motion.button
            key={`ghost-${i}`}
            type="button"
            className="tag-ghost"
            data-compact={tags.length >= SLOTS || undefined}
            aria-label={ghostLabel}
            title={tags.length >= SLOTS ? ghostLabel : undefined}
            aria-haspopup="listbox"
            aria-expanded={open}
            // One stop in the tab order: every ghost does the same thing.
            tabIndex={i === 0 ? 0 : -1}
            onClick={(e) => openFrom(e.currentTarget)}
            layout={still || dragging ? false : "position"}
            initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(2px)", transition: still ? INSTANT : { duration: 0.15, ease: EASE_OUT } }}
            transition={arrive}
          >
            <Plus size={12} weight="bold" aria-hidden="true" />
            {tags.length < SLOTS ? <span>Tag</span> : null}
          </motion.button>
        ))}
      </AnimatePresence>

      <Combobox.Root<string, true>
        multiple
        items={items}
        filter={null}
        autoHighlight
        open={open}
        onOpenChange={setOpen}
        onOpenChangeComplete={(isOpen) => {
          if (!isOpen) setQuery("");
        }}
        value={tags}
        onValueChange={(next) => {
          const created = next.find((t) => t.startsWith(CREATE));
          if (created) {
            add(created.slice(CREATE.length));
            setQuery("");
            return;
          }
          if (next.length > tags.length && full) return blocked();
          const gone = tags.find((t) => !next.includes(t));
          const added = next.find((t) => !tags.includes(t));
          setStatus(added ? `${added} added.` : gone ? `${gone} removed.` : "");
          onChange(next);
        }}
        inputValue={query}
        onInputValueChange={(v, details) => {
          // Keep the search on a pick, selected, so the list doesn't jump back
          // to the top under the pointer; the next keystroke starts a new one.
          if (details.reason === "input-clear" && details.isItemPress) {
            details.cancel();
            if (document.activeElement === input.current) input.current?.select();
            return;
          }
          setQuery(v);
        }}
      >
        <Combobox.Portal>
          <Combobox.Positioner anchor={anchor} align="start" sideOffset={6} className="ki-positioner">
            <Combobox.Popup
              className="ki-popup ki-ms-popup tags-picker"
              aria-label="Tags"
              data-lenis-prevent
              initialFocus={input}
              // Back to the ghost that opened it, or the first one if a pick took it away.
              finalFocus={() => (anchor?.isConnected ? anchor : firstGhost() ?? true)}
            >
              <div className="ki-ms-search">
                <MagnifyingGlass size={14} aria-hidden="true" />
                <Combobox.Input
                  ref={input}
                  className="ki-ms-input"
                  placeholder={full ? `Up to ${MAX} tags` : "Search or create a tag…"}
                  aria-label="Search tags"
                  maxLength={MAX_LENGTH}
                />
              </div>
              <Combobox.Empty className="ki-ms-empty">{query ? "No matching tags" : "No tags yet. Type to create one."}</Combobox.Empty>
              <Combobox.List className="ki-ms-list">
                {(item: string) => {
                  if (item.startsWith(CREATE)) {
                    const name = item.slice(CREATE.length);
                    return (
                      <Combobox.Item key={item} value={item} className="ki-ms-option tags-picker-create">
                        <Plus size={13} aria-hidden="true" />
                        <span>
                          Create <span className="ki-ms-label" data-tint={tagTint(name)}>{name}</span>
                        </span>
                      </Combobox.Item>
                    );
                  }
                  const on = tags.includes(item);
                  return (
                    <Combobox.Item key={item} value={item} data-sound={on ? "toggleOff" : "toggleOn"} className="ki-ms-option" disabled={full && !on}>
                      <span className="ki-ms-box" aria-hidden="true">
                        <motion.span
                          className="ki-ms-tick"
                          initial={false}
                          animate={on ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                          transition={still ? INSTANT : SLIDE}
                        >
                          <Check size={10} weight="bold" />
                        </motion.span>
                      </span>
                      <span className="ki-ms-label" data-tint={tagTint(item)}>
                        {item}
                      </span>
                      {counts.has(item) ? <span className="ki-ms-count">{counts.get(item)}</span> : null}
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
              <div className="ki-ms-footer">
                <span>
                  {tags.length} of {MAX}
                </span>
              </div>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>

      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}

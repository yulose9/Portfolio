"use client";

import { Combobox } from "@base-ui/react/combobox";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Check, Plus, X } from "@phosphor-icons/react";
import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "../../../lib/cn";
import { playSound } from "../../ui/sound";

/*
 * Tags: chips with a combobox to add, create and remove them, in the manner of
 * Kobra's multi-select and shadcn.io's tags.
 *
 * The chips are not Base UI's Combobox.Chips. Those own the arrow keys between
 * chips, and the arrow keys here belong to reordering: each chip's label is a
 * @hello-pangea/dnd handle (Space lifts, arrows move, Space drops, Escape puts
 * it back, all announced), and Alt+Arrow nudges one place without lifting. So
 * the Combobox only owns the field and its list, and the chip row is ours.
 *
 * The row is one line that scrolls sideways: the drag library measures a list
 * along one axis, and a wrapped row would drop chips into the wrong slot.
 */

const CREATE = "\u0000create:";
const fold = (s: string) => s.trim().toLocaleLowerCase();

export type TagsInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Known tags offered in the list. Typed text not among them can be created. */
  suggestions?: readonly string[];
  /** The field's accessible name, e.g. "Tags". */
  label: string;
  placeholder?: string;
  allowCreate?: boolean;
  max?: number;
  maxLength?: number;
  disabled?: boolean;
  /** Decorates a chip's label, e.g. with the tag's tint. */
  renderTag?: (tag: string) => ReactNode;
  /** Extra props for a chip, e.g. `data-tint`. */
  tagProps?: (tag: string) => Record<string, string | undefined>;
  className?: string;
  id?: string;
};

export function TagsInput({
  value,
  onChange,
  suggestions = [],
  label,
  placeholder = "Add a tag…",
  allowCreate = true,
  max = Infinity,
  maxLength = 40,
  disabled,
  renderTag,
  tagProps,
  className,
  id: idProp,
}: TagsInputProps) {
  const auto = useId();
  const id = idProp ?? auto;
  const field = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const handles = useRef(new Map<string, HTMLElement>());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const full = value.length >= max;

  const items = useMemo(() => {
    const q = fold(query);
    const seen = new Set<string>();
    const all = [...value, ...suggestions].filter((t) => {
      const k = fold(t);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    const matches = q ? all.filter((t) => fold(t).includes(q)) : all;
    const exact = q && seen.has(q);
    return allowCreate && q && !exact && !full ? [...matches, CREATE + query.trim().slice(0, maxLength)] : matches;
  }, [query, value, suggestions, allowCreate, full, maxLength]);

  const add = (raw: string) => {
    const tag = raw.trim().slice(0, maxLength);
    if (!tag) return false;
    if (value.some((t) => fold(t) === fold(tag))) return false;
    if (full) {
      playSound("blocked");
      setStatus(`Up to ${max} tags.`);
      return false;
    }
    onChange([...value, tag]);
    setStatus(`${tag} added.`);
    return true;
  };

  const remove = (tag: string, refocus?: "prev" | "input") => {
    const i = value.indexOf(tag);
    const next = value.filter((t) => t !== tag);
    onChange(next);
    setStatus(`${tag} removed.`);
    if (refocus === "prev" && next.length) {
      const neighbour = next[Math.min(i, next.length - 1)];
      requestAnimationFrame(() => handles.current.get(neighbour)?.focus());
    } else requestAnimationFrame(() => input.current?.focus());
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length || from === to) return;
    const next = [...value];
    const [tag] = next.splice(from, 1);
    next.splice(to, 0, tag);
    onChange(next);
    setStatus(`${tag} moved to position ${to + 1} of ${next.length}.`);
    requestAnimationFrame(() => handles.current.get(tag)?.focus());
  };

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (destination) move(source.index, destination.index);
  };

  const onChipKeys = (e: KeyboardEvent<HTMLElement>, tag: string, index: number) => {
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      move(index, index + (e.key === "ArrowLeft" ? -1 : 1));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(tag, "prev");
    }
  };

  return (
    <div className={cn("ki-tags", className)} data-slot="tags" data-disabled={disabled || undefined}>
      <Combobox.Root<string, true>
        multiple
        items={items}
        filter={null}
        autoHighlight
        disabled={disabled}
        value={value}
        onValueChange={(next) => {
          const created = next.find((t) => t.startsWith(CREATE));
          if (created) {
            add(created.slice(CREATE.length));
            setQuery("");
            return;
          }
          if (next.length > value.length && full) {
            playSound("blocked");
            setStatus(`Up to ${max} tags.`);
            return;
          }
          onChange(next);
        }}
        inputValue={query}
        onInputValueChange={(v) => setQuery(v)}
      >
        <div
          ref={field}
          className="ki-tags-field"
          onPointerDown={(e) => {
            // Clicking the field's empty space reaches for the input, as a
            // text field would; chips and their buttons keep their own press.
            if (e.target === e.currentTarget) {
              e.preventDefault();
              input.current?.focus();
            }
          }}
        >
          {value.length ? (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId={`${id}-chips`} direction="horizontal">
                {(drop) => (
                  <ul
                    ref={drop.innerRef}
                    {...drop.droppableProps}
                    className="ki-tags-chips"
                    aria-label={`${label}, ${value.length} selected`}
                  >
                    {value.map((tag, index) => (
                      <Draggable key={tag} draggableId={`${id}-${tag}`} index={index} isDragDisabled={disabled}>
                        {(drag, snapshot) => (
                          <li
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            className="ki-tag"
                            data-slot="tags-value"
                            data-dragging={snapshot.isDragging || undefined}
                            {...tagProps?.(tag)}
                          >
                            <span
                              {...drag.dragHandleProps}
                              ref={(el) => {
                                if (el) handles.current.set(tag, el);
                                else handles.current.delete(tag);
                              }}
                              data-slot="tags-item"
                              className="ki-tag-label"
                              aria-label={`${tag}, ${index + 1} of ${value.length}`}
                              aria-roledescription="Draggable tag"
                              title="Drag, or press Space to lift, to reorder. Delete removes it."
                              onKeyDown={(e) => onChipKeys(e, tag, index)}
                            >
                              {renderTag ? renderTag(tag) : tag}
                            </span>
                            <button
                              type="button"
                              data-slot="tags-remove"
                              className="ki-tag-remove"
                              aria-label={`Remove ${tag}`}
                              disabled={disabled}
                              onClick={() => remove(tag, "input")}
                            >
                              <X size={11} weight="bold" aria-hidden="true" />
                            </button>
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
          <Combobox.Input
            ref={input}
            id={id}
            data-slot="tags-input"
            className="ki-tags-input"
            placeholder={full ? `Up to ${max}` : value.length ? "" : placeholder}
            aria-label={label}
            aria-description={value.length ? "Backspace on an empty field removes the last tag. Comma adds what you typed." : undefined}
            maxLength={maxLength}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !query && value.length) {
                e.preventDefault();
                remove(value[value.length - 1], "input");
              } else if (e.key === "," && query.trim()) {
                e.preventDefault();
                if (add(query)) setQuery("");
              }
            }}
          />
        </div>

        <Combobox.Portal>
          <Combobox.Positioner anchor={field} sideOffset={6} className="ki-positioner">
            <Combobox.Popup className="ki-popup ki-tags-popup" data-lenis-prevent>
              <Combobox.Empty className="ki-tags-empty">{query ? "No matching tags" : "No tags yet. Type to create one."}</Combobox.Empty>
              <Combobox.List className="ki-tags-list">
                {(item: string) =>
                  item.startsWith(CREATE) ? (
                    <Combobox.Item key={item} value={item} data-slot="tags-option" className="ki-tags-option">
                      <Plus size={13} aria-hidden="true" />
                      <span>
                        Create <strong>“{item.slice(CREATE.length)}”</strong>
                      </span>
                    </Combobox.Item>
                  ) : (
                    <Combobox.Item key={item} value={item} data-slot="tags-option" className="ki-tags-option">
                      <Combobox.ItemIndicator className="ki-tags-check" keepMounted>
                        <Check size={13} weight="bold" aria-hidden="true" />
                      </Combobox.ItemIndicator>
                      <span>{item}</span>
                    </Combobox.Item>
                  )
                }
              </Combobox.List>
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

export default TagsInput;

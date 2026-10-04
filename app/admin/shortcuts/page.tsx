"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowCounterClockwise, MagnifyingGlass, Keyboard, Check } from "@phosphor-icons/react";
import {
  SHORTCUTS,
  prettyKeys,
  shortcutKey,
  validateBindings,
  type Bindings,
  type ShortcutId,
} from "../../../cms/shortcuts";
import { useBindings, SHORTCUT_STORAGE } from "../ui/shortcuts";
import { keys } from "../ui/menu";
import { Kbd, KbdGroup, Shortcut } from "../../components/kit/kbd";
import { playSound } from "../../components/ui/sound";

export default function ShortcutPage() {
  const bindings = useBindings();
  const [query, setQuery] = useState("");
  const [recordingId, setRecordingId] = useState<ShortcutId | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const save = (next: Bindings) => {
    try {
      const value = validateBindings(next);
      localStorage.setItem(SHORTCUT_STORAGE, JSON.stringify(value));
      setError("");
      setMessage("Shortcuts saved for this browser.");
      playSound("tap");
      window.dispatchEvent(new Event("writing:shortcuts"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save shortcuts.");
      playSound("toggleOff");
    }
  };

  const edit = (id: ShortcutId, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" || e.key === "Escape") {
      setRecordingId(null);
      return;
    }
    e.preventDefault();
    const key = shortcutKey(e);
    if (key) {
      save({ ...bindings, [id]: key });
      setRecordingId(null);
    }
  };

  const filteredShortcuts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SHORTCUTS;
    return SHORTCUTS.filter((s) => {
      const customKey = bindings[s.id];
      return (
        s.label.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q) ||
        prettyKeys(s.keys).toLowerCase().includes(q) ||
        Boolean(customKey && prettyKeys(customKey).toLowerCase().includes(q))
      );
    });
  }, [query, bindings]);

  const customCount = useMemo(() => {
    return Object.keys(bindings).filter(
      (id) => bindings[id as ShortcutId] && bindings[id as ShortcutId] !== SHORTCUTS.find((s) => s.id === id)?.keys
    ).length;
  }, [bindings]);

  return (
    <main className="shortcuts-page">
      <Link href="/admin" className="shortcuts-back-link" onClick={() => playSound("tap")}>
        <ArrowLeft size={14} aria-hidden="true" />
        <span>Back to workspace</span>
      </Link>

      <header className="shortcuts-header">
        <div>
          <div className="shortcuts-title-row">
            <Keyboard size={28} weight="duotone" className="shortcuts-title-icon" aria-hidden="true" />
            <h1>Keyboard shortcuts</h1>
          </div>
          <p>
            Click any shortcut to record your preferred key combination. <Kbd size="sm">Mod</Kbd> maps to <Kbd size="sm">Ctrl</Kbd> on Windows/Linux or <Kbd size="sm">⌘</Kbd> on macOS.
          </p>
        </div>

        {customCount > 0 ? (
          <button
            type="button"
            className="admin-button admin-button-quiet shortcuts-reset-all"
            onClick={() => {
              save({});
              playSound("chirp");
            }}
          >
            <ArrowCounterClockwise size={14} aria-hidden="true" />
            Reset all ({customCount})
          </button>
        ) : null}
      </header>

      <div className="shortcuts-search-wrap">
        <label className="admin-search shortcut-search">
          <MagnifyingGlass size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search shortcuts"
            placeholder="Search commands, actions, or keys…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {error ? (
        <div className="control-notice shortcuts-alert" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      {message ? (
        <div className="shortcuts-status-msg" role="status">
          <Check size={14} aria-hidden="true" />
          <span>{message}</span>
        </div>
      ) : null}

      <div className="shortcut-list">
        {filteredShortcuts.map((s) => {
          const currentKeys = bindings[s.id] ?? s.keys;
          const isCustom = bindings[s.id] && bindings[s.id] !== s.keys;
          const isRecording = recordingId === s.id;

          return (
            <div key={s.id} className="shortcut-row" data-custom={isCustom || undefined}>
              <div className="shortcut-meta">
                <span className="shortcut-label">{s.label}</span>
                <span className="shortcut-group-badge">{s.group}</span>
              </div>

              <div className="shortcut-action">
                <div
                  className="shortcut-key-trigger"
                  data-recording={isRecording || undefined}
                  onClick={() => setRecordingId(s.id)}
                >
                  <input
                    aria-label={`${s.label} shortcut`}
                    readOnly
                    value={keys(prettyKeys(currentKeys))}
                    onFocus={() => {
                      setRecordingId(s.id);
                      playSound("select");
                    }}
                    onBlur={() => setRecordingId(null)}
                    onKeyDown={(e) => edit(s.id, e)}
                    className="shortcut-hidden-input"
                  />
                  {isRecording ? (
                    <span className="shortcut-recording-hint">
                      <span className="shortcut-rec-dot" />
                      Press keys…
                    </span>
                  ) : (
                    <Shortcut keys={keys(prettyKeys(currentKeys))} size="md" />
                  )}
                </div>

                {isCustom ? (
                  <button
                    type="button"
                    className="admin-button admin-button-quiet shortcut-reset-btn"
                    title={`Reset to default: ${keys(prettyKeys(s.keys))}`}
                    onClick={() => {
                      const next = { ...bindings };
                      delete next[s.id];
                      save(next);
                      playSound("toggleOff");
                    }}
                  >
                    <ArrowCounterClockwise size={13} aria-hidden="true" />
                    <span className="shortcut-reset-text">Reset</span>
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <section className="shortcuts-reference-grid">
        <div className="shortcuts-ref-card">
          <h2>Editor essentials</h2>
          <ul className="shortcuts-ref-list">
            <li>
              <Kbd size="sm">/</Kbd>
              <span>Inserts block templates and components</span>
            </li>
            <li>
              <Kbd size="sm">@</Kbd>
              <span>Inserts relative date mentions and internal page links</span>
            </li>
            <li>
              <Kbd size="sm">:</Kbd>
              <span>Searches and inserts emoji</span>
            </li>
            <li>
              <Kbd size="sm">Esc</Kbd>
              <span>Closes any open menu, suggestion popover, or drawer</span>
            </li>
            <li>
              <Kbd size="sm">↵</Kbd>
              <span>Selects the highlighted item in suggestions</span>
            </li>
            <li>
              <KbdGroup gap="tight">
                <Kbd size="sm">⇧</Kbd>
                <Kbd size="sm">↵</Kbd>
              </KbdGroup>
              <span>Inserts a soft line break without creating a new block</span>
            </li>
            <li>
              <KbdGroup gap="tight">
                <Kbd size="sm">Mod</Kbd>
                <Kbd size="sm">A</Kbd>
              </KbdGroup>
              <span>Selects current block; press again to select whole document</span>
            </li>
            <li>
              <KbdGroup gap="tight">
                <Kbd size="sm">Mod</Kbd>
                <Kbd size="sm">⌥</Kbd>
                <Kbd size="sm">F</Kbd>
              </KbdGroup>
              <span>Opens in-page find and replace</span>
            </li>
            <li>
              <KbdGroup gap="tight">
                <Kbd size="sm">Mod</Kbd>
                <Kbd size="sm">⇧</Kbd>
                <Kbd size="sm">V</Kbd>
              </KbdGroup>
              <span>Pastes clipboard content as plain unformatted text</span>
            </li>
            <li>
              <KbdGroup gap="tight">
                <Kbd size="sm">Mod</Kbd>
                <Kbd size="sm">⇧</Kbd>
                <Kbd size="sm">H</Kbd>
              </KbdGroup>
              <span>Toggles text highlight on current selection</span>
            </li>
          </ul>
        </div>

        <div className="shortcuts-ref-card">
          <h2>Workspace & navigation</h2>
          <ul className="shortcuts-ref-list">
            <li>
              <KbdGroup gap="tight">
                <Kbd size="sm">Mod</Kbd>
                <Kbd size="sm">K</Kbd>
              </KbdGroup>
              <span>Opens global quick search & command palette</span>
            </li>
            <li>
              <KbdGroup gap="tight">
                <Kbd size="sm">Mod</Kbd>
                <Kbd size="sm">B</Kbd>
              </KbdGroup>
              <span>Toggles the sidebar between expanded and compact icon rail</span>
            </li>
            <li>
              <Kbd size="sm">N</Kbd>
              <span>Creates a new post or project draft from any listing</span>
            </li>
            <li>
              <Kbd size="sm">/</Kbd>
              <span>Focuses the list search filter from the table view</span>
            </li>
            <li>
              <KbdGroup gap="tight">
                <Kbd size="sm">Mod</Kbd>
                <Kbd size="sm">A</Kbd>
              </KbdGroup>
              <span>Selects all visible rows in bulk action mode</span>
            </li>
            <li>
              <Kbd size="sm">Esc</Kbd>
              <span>Clears table selection or closes bulk actions bar</span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}

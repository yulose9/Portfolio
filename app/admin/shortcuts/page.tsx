"use client";
import { useState } from "react";
import {
  SHORTCUTS,
  shortcutKey,
  validateBindings,
  type Bindings,
  type ShortcutId,
} from "../../../cms/shortcuts";
import { useBindings, SHORTCUT_STORAGE } from "../ui/shortcuts";
export default function ShortcutPage() {
  const bindings = useBindings();
  const [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");

  const save = (next: Bindings) => {
    try {
      const value = validateBindings(next);
      localStorage.setItem(SHORTCUT_STORAGE, JSON.stringify(value));
      setError("");
      setMessage("Shortcuts saved for this browser.");
      window.dispatchEvent(new Event("writing:shortcuts"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save shortcuts.");
    }
  };
  const edit = (id: ShortcutId, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab" || e.key === "Escape") return;
    e.preventDefault();
    const key = shortcutKey(e);
    if (key) save({ ...bindings, [id]: key });
  };
  return (
    <main className="shortcuts-page">
      <a href="/admin">← Writing</a>
      <header>
        <div>
          <h1>Keyboard shortcuts</h1>
          <p>
            Click a shortcut and press your preferred keys. Mod means Ctrl on
            Windows or ⌘ on Mac.
          </p>
        </div>
        <button className="admin-button" onClick={() => save({})}>
          Reset all
        </button>
      </header>
      <input
        className="shortcut-search"
        type="search"
        aria-label="Search shortcuts"
        placeholder="Find an action…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {error ? <p role="alert">{error}</p> : null}
      <p role="status" className="field-help">
        {message}
      </p>
      <div className="shortcut-list">
        {SHORTCUTS.filter((s) =>
          `${s.label} ${s.group}`.toLowerCase().includes(query.toLowerCase()),
        ).map((s) => (
          <label key={s.id}>
            <span>
              {s.label}
              <small>{s.group}</small>
            </span>
            <input
              aria-label={`${s.label} shortcut`}
              readOnly
              value={bindings[s.id] ?? s.keys}
              onKeyDown={(e) => edit(s.id, e)}
            />
          </label>
        ))}
      </div>
      <section>
        <h2>Editor essentials</h2>
        <p>
          / inserts blocks. @ inserts dates and page links. : searches emoji.
          Escape closes a menu. Enter selects its highlighted option.
          Shift+Enter adds a soft line break. Ctrl/⌘+A selects a block, then the
          whole document. Ctrl/⌘+Alt+F also opens replace. These structural
          shortcuts stay fixed.
        </p>
        <p>
          Your custom bindings apply in the writing editor. Browser and
          operating-system shortcuts may take precedence.
        </p>
      </section>
    </main>
  );
}

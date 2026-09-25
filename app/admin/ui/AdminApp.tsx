"use client";

import { ArrowSquareOut, House, NotePencil, SignOut } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";

import { toast } from "../../lib/toast";
import { api, ApiError } from "./api";
import Editor, { type OpenOptions, type Panel } from "./Editor";
import { Fluent } from "./extensions/emoji";
import PostList from "./PostList";
import { useCommands } from "./registry";
import SearchPalette from "./SearchPalette";
import { TEMPLATES } from "./templates";

const CI = { size: 16, "aria-hidden": true } as const;

/*
 * Two screens, one URL: /admin is the list, /admin?post=<id> is the editor.
 * A query string rather than a path because this is one static file; the
 * history entries still make Back behave.
 */

type Gate = { state: "checking" } | { state: "ok"; email: string } | { state: "blocked"; message: string };

function currentPost(): string | null {
  return new URLSearchParams(window.location.search).get("post");
}

/** ?q=…&n=… open find-in-page on a match; ?panel=… opens a sheet. */
function currentOptions(): OpenOptions {
  const p = new URLSearchParams(window.location.search);
  const panel = p.get("panel");
  return {
    q: p.get("q") ?? undefined,
    n: Number(p.get("n")) || 0,
    panel: panel === "details" || panel === "revisions" || panel === "publish" ? panel : null,
  };
}

export default function AdminApp() {
  const [gate, setGate] = useState<Gate>({ state: "checking" });
  const [postId, setPostId] = useState<string | null>(() => currentPost());
  const [options, setOptions] = useState<OpenOptions>(() => currentOptions());
  const [searching, setSearching] = useState(false);

  // ⌘K anywhere but inside the text (where it makes a link): search every post.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !(e.target as Element | null)?.closest?.(".ProseMirror")) {
        e.preventDefault();
        setSearching(true);
      }
    };
    const onPalette = () => setSearching(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("admin:palette", onPalette);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("admin:palette", onPalette);
    };
  }, []);

  useEffect(() => {
    api
      .me()
      .then((me) => setGate({ state: "ok", email: me.email }))
      .catch((error: unknown) =>
        setGate({ state: "blocked", message: error instanceof ApiError ? error.message : "The admin can't be reached." })
      );
  }, []);

  useEffect(() => {
    const onPop = () => {
      setPostId(currentPost());
      setOptions(currentOptions());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const open = useCallback((id: string | null, opts: OpenOptions = {}) => {
    const params = new URLSearchParams();
    if (id) params.set("post", id);
    if (opts.q) params.set("q", opts.q);
    if (opts.n) params.set("n", String(opts.n));
    if (opts.panel) params.set("panel", opts.panel);
    const qs = params.toString();
    window.history.pushState(null, "", qs ? `/admin?${qs}` : "/admin");
    setPostId(id);
    setOptions(opts);
    window.scrollTo({ top: 0 });
  }, []);

  const create = (init: Parameters<typeof api.create>[0] = {}) =>
    void api
      .create(init)
      .then(({ post }) => open(post.id))
      .catch((error: unknown) => toast.add({ type: "error", title: "Couldn’t start a post", description: error instanceof ApiError ? error.message : undefined }));

  useCommands(() => [
    { id: "new", group: "Go to", title: "New post", keys: "N", icon: <NotePencil {...CI} />, keywords: ["create", "write", "draft", "blank"], run: () => create() },
    ...TEMPLATES.filter((t) => t.id !== "blank").map((t) => ({
      id: `new:${t.id}`,
      group: "Go to" as const,
      title: `New post: ${t.title}`,
      icon: <Fluent emoji={t.emoji} size={16} />,
      keywords: ["template", "create", t.hint],
      run: () => create(t.init),
    })),
    ...(postId ? [{ id: "home", group: "Go to" as const, title: "All writing", icon: <House {...CI} />, keywords: ["home", "list", "back", "dashboard"], run: () => open(null) }] : []),
    { id: "site", group: "Go to", title: "Open the site", icon: <ArrowSquareOut {...CI} />, keywords: ["live", "nazarene.dev", "writing"], run: () => window.open("/writing", "_blank", "noopener") },
    { id: "signout", group: "Go to", title: "Sign out", icon: <SignOut {...CI} />, keywords: ["logout", "access"], run: () => window.open("/cdn-cgi/access/logout", "_self") },
  ]);

  if (gate.state === "checking") return <div className="admin-loading" aria-busy="true" />;
  if (gate.state === "blocked") {
    return (
      <main className="admin-gate">
        <p className="admin-gate-title">Can’t open the admin</p>
        <p className="admin-gate-text">{gate.message}</p>
        <button type="button" className="admin-button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </main>
    );
  }

  return (
    <>
      {postId ? (
        <Editor key={`${postId}:${options.q ?? ""}:${options.n ?? 0}:${options.panel ?? ""}`} id={postId} options={options} onBack={() => open(null)} />
      ) : (
        <PostList email={gate.email} onOpen={(id, panel?: Panel) => open(id, { panel })} onSearch={() => setSearching(true)} />
      )}
      <SearchPalette
        open={searching}
        onClose={() => setSearching(false)}
        onJump={(j) => open(j.id, { q: j.q, n: j.n })}
      />
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";

import { api, ApiError } from "./api";
import Editor from "./Editor";
import PostList from "./PostList";

/*
 * Two screens, one URL: /admin is the list, /admin?post=<id> is the editor.
 * A query string rather than a path because this is one static file; the
 * history entries still make Back behave.
 */

type Gate = { state: "checking" } | { state: "ok"; email: string } | { state: "blocked"; message: string };

function currentPost(): string | null {
  return new URLSearchParams(window.location.search).get("post");
}

export default function AdminApp() {
  const [gate, setGate] = useState<Gate>({ state: "checking" });
  const [postId, setPostId] = useState<string | null>(() => currentPost());

  useEffect(() => {
    api
      .me()
      .then((me) => setGate({ state: "ok", email: me.email }))
      .catch((error: unknown) =>
        setGate({ state: "blocked", message: error instanceof ApiError ? error.message : "The admin can't be reached." })
      );
  }, []);

  useEffect(() => {
    const onPop = () => setPostId(currentPost());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const open = useCallback((id: string | null) => {
    const url = id ? `/admin?post=${encodeURIComponent(id)}` : "/admin";
    window.history.pushState(null, "", url);
    setPostId(id);
    window.scrollTo({ top: 0 });
  }, []);

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

  return postId ? (
    <Editor key={postId} id={postId} onBack={() => open(null)} />
  ) : (
    <PostList email={gate.email} onOpen={open} />
  );
}

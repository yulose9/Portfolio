"use client";

import { ArrowSquareOut, House, NotePencil, SignOut, SpeakerHigh, SpeakerLow, SpeakerNone } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "../../lib/toast";
import { setSoundMuted, setSoundVolume, useSoundMuted, useSoundVolume } from "../../components/ui/sound";
import { api, ApiError, setApiWorkspace } from "./api";
import Editor, { type OpenOptions, type Panel } from "./Editor";
import { Fluent } from "./extensions/emoji";
import TagPages from "./TagPages";
import PostList from "./PostList";
import { useCommands } from "./registry";
import SearchPalette from "./SearchPalette";
import { TEMPLATES } from "./templates";
import SessionGuard from "./SessionGuard";
import ControlShell, { destinationFromUrl, type Destination } from "./ControlShell";
import AnalyticsDashboard from "./AnalyticsDashboard";
import WebsiteEditor from "./WebsiteEditor";
import ProjectsWorkspace from "./ProjectsWorkspace";
import { protectWork } from "./session";

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
    block:p.get("block")??undefined,
    n: Number(p.get("n")) || 0,
    panel: panel === "details" || panel === "revisions" || panel === "publish" || panel === "research" ? panel : null,
  };
}

export default function AdminApp() {
  const [section, setSection] = useState<Destination>(destinationFromUrl);
  const currentRoute = useRef(window.location.href);
  const navigating = useRef(false);
  setApiWorkspace(section === "projects" ? "projects" : "writing");
  const [tagsOpen,setTagsOpen]=useState(false);
  const [gate, setGate] = useState<Gate>({ state: "checking" });
  const [postId, setPostId] = useState<string | null>(() => currentPost());
  const [options, setOptions] = useState<OpenOptions>(() => currentOptions());
  const [searchQuery,setSearchQuery]=useState("");
  const [searching, setSearching] = useState(false);
  const soundMuted = useSoundMuted();
  const soundVolume = useSoundVolume();

  // ⌘K anywhere: search and actions. Inside the text the editor opens it itself.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k" && !(e.target as Element | null)?.closest?.(".ProseMirror")) {
        e.preventDefault();
        setSearching(true);
      }
    };
    const onPalette = (event:Event) => {setSearchQuery((event as CustomEvent<{query?:string}>).detail?.query??"");setSearching(true);};
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
    const onPop = async () => {
      const target = window.location.href;
      window.history.replaceState(null, "", currentRoute.current);
      if (navigating.current) return;
      navigating.current = true;
      const protection = await protectWork();
      navigating.current = false;
      if (protection.pending || (!protection.saved && !protection.recoverable)) {
        toast.add({ type: "error", title: "Keep this page open", description: "Save your changes or finish pending uploads before leaving." });
        return;
      }
      window.history.replaceState(null, "", target);
      currentRoute.current = target;
      setSection(destinationFromUrl());
      setPostId(currentPost());
      setOptions(currentOptions());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const open = useCallback((id: string | null, opts: OpenOptions = {}) => {
    const params = new URLSearchParams();
    const destination = destinationFromUrl() === "projects" ? "projects" : "writing";
    params.set("section", destination);
    setSection(destination);
    if (id) params.set("post", id);
    if (opts.q) params.set("q", opts.q);
    if (opts.n) params.set("n", String(opts.n));
    if (opts.panel) params.set("panel", opts.panel);
    if (opts.block) params.set("block",opts.block);
    const qs = params.toString();
    window.history.pushState(null, "", qs ? `/admin?${qs}` : "/admin");
    currentRoute.current = window.location.href;
    setPostId(id);
    setOptions(opts);
    window.scrollTo({ top: 0 });
  }, []);

  const navigate = async (destination: Destination) => {
    if (navigating.current) return;
    navigating.current = true;
    const protection = await protectWork();
    navigating.current = false;
    if (protection.pending || (!protection.saved && !protection.recoverable)) {
      toast.add({ type: "error", title: "Keep this page open", description: "Finish pending uploads or save your changes before switching sections." });
      return;
    }
    window.history.pushState(null, "", `/admin?section=${destination}`);
    currentRoute.current = window.location.href;
    setSection(destination); setPostId(null); setOptions({});
    window.scrollTo({ top: 0 });
  };

  const create = (init: Parameters<typeof api.create>[0] = {}) =>
    void api
      .create(init)
      .then(({ post }) => open(post.id))
      .catch((error: unknown) => toast.add({ type: "error", title: "Couldn’t create a post", description: error instanceof ApiError ? error.message : undefined }));

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
    {id:"tags",group:"Go to",title:"Edit tag pages",keywords:["tags","topics","description"],icon:<NotePencil {...CI}/>,run:()=>setTagsOpen(true)},
    { id: "site", group: "Go to", title: "View on site", icon: <ArrowSquareOut {...CI} />, keywords: ["live", "nazarene.dev", "writing"], run: () => window.open("/writing", "_blank", "noopener") },
    { id: "signout", group: "Go to", title: "Sign out", icon: <SignOut {...CI} />, keywords: ["logout", "access"], run: () => window.open("/cdn-cgi/access/logout", "_self") },
    // The keyboard path to the speaker in the top bar, and the only place the volume lives.
    { id: "sound", group: "View", title: "Interface sounds", checked: !soundMuted, icon: soundMuted ? <SpeakerNone {...CI} /> : <SpeakerHigh {...CI} />, keywords: ["sound", "audio", "mute", "unmute", "clicks"], run: () => setSoundMuted(!soundMuted) },
    ...([
      ["quiet", "Quiet", 0.25, SpeakerLow],
      ["normal", "Normal", 0.5, SpeakerHigh],
      ["loud", "Loud", 0.85, SpeakerHigh],
    ] as const).map(([id, label, level, Icon]) => ({
      id: `sound:${id}`,
      group: "View" as const,
      title: `Sound volume: ${label}`,
      checked: !soundMuted && Math.abs(soundVolume - level) < 0.01,
      disabled: soundMuted ? "Interface sounds are off" : undefined,
      icon: <Icon {...CI} />,
      keywords: ["sound", "volume", "audio", "loud", "quiet"],
      run: () => setSoundVolume(level),
    })),
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
    <ControlShell section={section} onNavigate={destination => void navigate(destination)} email={gate.email}>
      <SessionGuard />
      <TagPages open={tagsOpen} onClose={()=>setTagsOpen(false)}/>
      {section === "overview" || section === "analytics" ? <AnalyticsDashboard overview={section === "overview"} onWrite={() => void navigate("writing")} onNavigate={destination => void navigate(destination)} /> : section === "website" ? <WebsiteEditor /> : section === "projects" && !postId ? <ProjectsWorkspace onOpen={id => open(id)} /> : postId ? (
        <Editor key={`${postId}:${options.q ?? ""}:${options.n ?? 0}:${options.panel ?? ""}`} id={postId} options={options} onBack={() => open(null)} onOpen={id => open(id)} />
      ) : (
        <PostList onTags={()=>setTagsOpen(true)} email={gate.email} onOpen={(id, panel?: Panel) => open(id, { panel })} onSearch={() => setSearching(true)} />
      )}
      <SearchPalette
        open={searching}
        initialQuery={searchQuery}
        onClose={() => {setSearching(false);setSearchQuery("");}}
        onJump={(j) => open(j.id, { q: j.q, n: j.n,block:j.block })}
      />
    </ControlShell>
  );
}

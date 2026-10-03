"use client";

import { Popover } from "@base-ui/react/popover";
import { ArrowCounterClockwise, Prohibit, X } from "@phosphor-icons/react";
import type { Editor } from "@tiptap/core";
import { useEffect, useRef, useState } from "react";

import { calloutIconImage, cleanCalloutIcon, NO_ICON } from "../../../../cms/callout-icon";
import { fluentUrl } from "../../../../cms/emoji";
import { MagneticDropzone } from "../../../components/kit/inputs/magnetic-dropzone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/kit/tabs";
import { onRadioKeys } from "../bits";
import IconLibrary from "../IconLibrary";
import { uploadInlineLogo } from "../media";
import { beginPendingWork } from "../session";
import { Callout, CALLOUT_TYPES, calloutIcon, toneOf } from "./blocks";
import { EmojiPicker } from "./emoji";

/*
 * The callout, in the editor: the same DOM as its renderHTML (so the page's
 * callout styles, drag handles and Markdown all see the same thing), with an
 * icon you can press. Pressing it (click, or Enter / Space when it has focus)
 * opens CalloutIconPicker: emoji, the icon library, an uploaded or pasted
 * image, no icon, and the callout's colour. One picker serves every callout; the view asks for it
 * with an event, the way the slash menu's emoji picker is opened.
 */

const OPEN = "admin:callout-icon";
type Request = { anchor: HTMLElement; editor: Editor; getPos: () => number | undefined };

const LABEL: Record<string, string> = { note: "Note", tip: "Tip", important: "Important", warning: "Warning", caution: "Caution" };

function paintIcon(slot: HTMLElement, value: unknown, kind: string) {
  const icon = calloutIcon(value, kind);
  slot.replaceChildren();
  slot.toggleAttribute("data-empty", icon.none);
  if (icon.image) {
    const img = document.createElement("img");
    img.className = "callout-icon-image";
    img.src = icon.image;
    img.alt = "";
    img.draggable = false;
    slot.append(img);
  } else if (icon.emoji) {
    const fe = document.createElement("span");
    fe.className = "fe";
    fe.style.setProperty("--fe", `url(${fluentUrl(icon.emoji)})`);
    fe.textContent = icon.emoji;
    slot.append(fe);
  }
}

export const CalloutWithPicker = Callout.extend({
  addNodeView() {
    return ({ node: initial, editor, getPos }) => {
      let node = initial;
      const dom = document.createElement("aside");
      const icon = document.createElement("span");
      const body = document.createElement("div");
      dom.className = "callout";
      dom.setAttribute("data-callout", "");
      icon.className = "callout-icon";
      icon.contentEditable = "false";
      icon.setAttribute("data-callout-toggle", "");
      icon.setAttribute("role", "button");
      icon.setAttribute("tabindex", "0");
      icon.setAttribute("aria-haspopup", "dialog");
      body.className = "callout-body";
      dom.append(icon, body);

      const paint = () => {
        const kind = String(node.attrs.type ?? "note");
        dom.setAttribute("data-type", toneOf(kind));
        dom.setAttribute("data-kind", kind);
        if (node.attrs.icon) dom.setAttribute("data-icon", String(node.attrs.icon));
        else dom.removeAttribute("data-icon");
        icon.setAttribute("aria-label", node.attrs.icon === NO_ICON ? "Add callout icon" : "Change callout icon");
        paintIcon(icon, node.attrs.icon, kind);
      };
      paint();

      const open = () => {
        if (!editor.isEditable) return;
        window.dispatchEvent(new CustomEvent<Request>(OPEN, { detail: { anchor: icon, editor, getPos: () => (typeof getPos === "function" ? getPos() : undefined) } }));
      };
      // Pressing the icon mustn't move the caret, or select the block.
      icon.addEventListener("mousedown", (e) => e.preventDefault());
      icon.addEventListener("click", (e) => {
        e.preventDefault();
        open();
      });
      icon.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        open();
      });

      return {
        dom,
        contentDOM: body,
        update: (next) => {
          if (next.type !== node.type) return false;
          node = next;
          paint();
          return true;
        },
        // The icon is a control, not text: ProseMirror leaves its events and
        // its repainting alone.
        stopEvent: (event) => icon.contains(event.target as globalThis.Node),
        ignoreMutation: (m) => m.type !== "selection" && (icon.contains(m.target) || m.target === dom),
      };
    };
  },
});

/** The picker every callout's icon opens. Mounted once, beside the editor. */
export function CalloutIconPicker() {
  const [request, setRequest] = useState<Request | null>(null);
  const [tab, setTab] = useState("emoji");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [, setVersion] = useState(0);
  const anchor = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<Request>).detail;
      anchor.current = detail.anchor;
      const current = attrsOf(detail);
      const image = current ? calloutIconImage(String(current.icon ?? "")) : "";
      setTab(image ? "custom" : "emoji");
      setUrl(image && !image.startsWith("/media/") ? image : "");
      setError("");
      setRequest(detail);
    };
    window.addEventListener(OPEN, onOpen);
    return () => window.removeEventListener(OPEN, onOpen);
  }, []);

  const attrs = request ? attrsOf(request) : null;
  const kind = String(attrs?.type ?? "note");
  const value = String(attrs?.icon ?? "");

  const update = (patch: Record<string, unknown>) => {
    if (!request) return;
    const pos = request.getPos();
    const node = pos == null ? null : request.editor.state.doc.nodeAt(pos);
    if (pos == null || node?.type.name !== "callout") return;
    request.editor.view.dispatch(request.editor.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...patch }));
    // The picker reads the node on render: show the change while it stays open.
    setVersion((v) => v + 1);
  };
  const close = () => {
    if (!busy) setRequest(null);
  };
  const choose = (icon: string) => {
    update({ icon });
    setRequest(null);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const finish = beginPendingWork();
    setBusy(true);
    setError("");
    try {
      // The inline-logo path: decoded in the browser (SVG included), squared
      // down to 256px WebP, and uploaded to the media library.
      const src = await uploadInlineLogo(file);
      update({ icon: src });
      setBusy(false);
      setRequest(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setBusy(false);
    } finally {
      finish();
    }
  };
  const applyUrl = () => {
    const icon = cleanCalloutIcon(url.trim());
    if (!icon || !calloutIconImage(icon)) {
      setError("Paste an image link that starts with https://");
      return;
    }
    choose(icon);
  };

  const shown = calloutIcon(value, kind);

  return (
    <Popover.Root open={Boolean(request)} onOpenChange={(open) => (open ? null : close())}>
      <Popover.Portal>
        <Popover.Positioner className="menu-positioner" anchor={anchor} side="bottom" align="start" sideOffset={8} collisionPadding={12}>
          <Popover.Popup className="menu-popup admin-popover callout-icon-panel" data-lenis-prevent finalFocus={anchor}>
            <div className="picker-heading">
              <Popover.Title>Callout icon</Popover.Title>
              <Popover.Close data-slot="popover-close" className="admin-icon-button" aria-label="Close callout icon" disabled={busy}>
                <X size={15} />
              </Popover.Close>
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(String(v))} className="callout-icon-tabs">
              <TabsList aria-label="Icon source">
                <TabsTrigger value="emoji">Emoji</TabsTrigger>
                <TabsTrigger value="icons">Icons</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
              <TabsContent value="emoji">
                <EmojiPicker onPick={choose} />
              </TabsContent>
              <TabsContent value="icons">
                <IconLibrary onPick={choose} onBusy={setBusy} />
              </TabsContent>
              <TabsContent value="custom" className="callout-icon-custom">
                {shown.image ? (
                  <div className="callout-icon-current">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shown.image} alt="" />
                    <span>Current image</span>
                  </div>
                ) : null}
                <MagneticDropzone
                  className="callout-icon-drop"
                  accept="image/svg+xml,image/png,image/jpeg,image/webp,.svg,.png,.jpg,.jpeg,.webp"
                  maxSize={20 * 1024 * 1024}
                  disabled={busy}
                  title={busy ? "Uploading…" : "Drop an image"}
                  hint="SVG, PNG, JPG or WebP. Square works best."
                  onFiles={(files) => void upload(files[0])}
                />
                <form
                  className="callout-icon-url"
                  onSubmit={(e) => {
                    e.preventDefault();
                    applyUrl();
                  }}
                >
                  <label className="picker-field">
                    Or paste an image link
                    <input
                      value={url}
                      inputMode="url"
                      placeholder="https://…/icon.png"
                      disabled={busy}
                      onChange={(e) => {
                        setUrl(e.target.value);
                        setError("");
                      }}
                    />
                  </label>
                  <button type="submit" className="admin-button" disabled={busy || !url.trim()}>
                    Use
                  </button>
                </form>
                {error ? (
                  <p role="alert" className="field-error">
                    {error}
                  </p>
                ) : null}
              </TabsContent>
            </Tabs>
            <div className="callout-icon-foot">
              <div className="callout-tones" role="radiogroup" aria-label="Callout colour" onKeyDown={onRadioKeys}>
                {CALLOUT_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={toneOf(kind) === t}
                    tabIndex={toneOf(kind) === t ? 0 : -1}
                    className="callout-tone"
                    data-tone={t}
                    aria-label={LABEL[t]}
                    title={LABEL[t]}
                    onClick={() => update({ type: t })}
                  />
                ))}
              </div>
              <div className="callout-icon-actions">
                {value && value !== NO_ICON ? (
                  <button type="button" className="admin-button admin-button-quiet" disabled={busy} onClick={() => choose("")} title="Back to the colour's own emoji">
                    <ArrowCounterClockwise size={14} aria-hidden="true" />
                    Reset
                  </button>
                ) : null}
                <button type="button" className="admin-button admin-button-quiet" disabled={busy || value === NO_ICON} onClick={() => choose(NO_ICON)}>
                  <Prohibit size={14} aria-hidden="true" />
                  Remove icon
                </button>
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function attrsOf(request: Request): Record<string, unknown> | null {
  const pos = request.getPos();
  const node = pos == null ? null : request.editor.state.doc.nodeAt(pos);
  return node?.type.name === "callout" ? node.attrs : null;
}

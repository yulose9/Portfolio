"use client";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { api } from "./api";
import { SESSION_EVENT, sessionExpiry, protectWork, markLeaving } from "./session";

export default function SessionGuard() {
  const [open, setOpen] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Saving your latest changes…");
  const warned = useRef(0);
  useEffect(() => {
    let alive = true;
    const check = () => {
      if (sessionExpiry - Date.now() > 120_000 && warned.current) { setNeedsSignIn(false); setOpen(false); }
      if (!sessionExpiry || sessionExpiry - Date.now() > 120_000 || warned.current >= sessionExpiry) return;
      warned.current = sessionExpiry;
      setNeedsSignIn(true);
      setOpen(true);
      setBusy(true);
      void protectWork().then(result => {
        if (!alive) return;
        setMessage(result.pending ? "An upload or recording is still in progress. Finish it before signing in again." : result.saved ? "Your latest changes are saved. Sign in again to continue editing." : result.recoverable
          ? "Your latest changes are kept in this browser tab. After signing in, restore them when the editor reopens."
          : "Your changes could not be saved or kept in this tab. Stay here and copy or download your work before signing in.");
      }).finally(() => { if (alive) setBusy(false); });
    };
    const refresh = () => { check(); void api.me().catch(() => {}); };
    check();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener(SESSION_EVENT, check);
    window.addEventListener("focus", refresh);
    return () => { alive = false; clearInterval(timer); window.removeEventListener(SESSION_EVENT, check); window.removeEventListener("focus", refresh); };
  }, []);
  const signIn = async () => {
    setBusy(true);
    const result = await protectWork();
    if (result.pending) {
      setMessage("An upload or recording is still in progress. Finish it before signing in again.");
      setBusy(false);
      return;
    }
    if (!result.saved && !result.recoverable) {
      setMessage("Your changes are not protected yet. Stay here and download or copy your work first.");
      setBusy(false);
      return;
    }
    try {
      // Only the explicit confirmation revokes Access. Navigation returns to this draft.
      const response = await fetch("/cdn-cgi/access/logout", { credentials: "same-origin", redirect: "manual", signal:AbortSignal.timeout(15_000) });
      if (!response.ok && response.type !== "opaqueredirect") throw new Error("logout");
      markLeaving();
      // A full navigation is required so Cloudflare Access challenges the request.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/admin${window.location.search}`);
    } catch {
      setMessage("Sign-out could not be completed. Your work is still here. Check your connection and try again.");
      setBusy(false);
    }
  };
  return <>
    {needsSignIn && !open ? <aside className="session-reminder" aria-label="Session renewal"><span>Sign in again to keep saving</span><button type="button" className="admin-button" onClick={() => setOpen(true)}>Review and sign in</button></aside> : null}
    <Dialog.Root open={open} onOpenChange={next => { if (!next && !busy) setOpen(false); }}>
    <Dialog.Portal><Dialog.Backdrop className="sheet-backdrop" data-variant="center" />
      <Dialog.Popup className="sheet" data-variant="center">
        <div className="sheet-body session-notice">
          <Dialog.Title className="sheet-title">Time to sign in again</Dialog.Title>
          <Dialog.Description>Your Cloudflare Access session is ending. This editor will stay open until you choose to sign in again.</Dialog.Description>
          <p role="status">{message}</p>
          <div className="session-actions"><Dialog.Close data-slot="dialog-close" className="admin-button" disabled={busy}>Stay here</Dialog.Close>
            <button type="button" className="admin-button admin-button-primary" disabled={busy} onClick={() => void signIn()}>{busy ? "Saving…" : "Okay, sign in again"}</button></div>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root></>;
}

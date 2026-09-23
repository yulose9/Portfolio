"use client";

import { useCallback, useRef, useState } from "react";
import { haptic } from "../lib/haptics";

/**
 * A 20px WebP of the same portrait, inlined.
 *
 * It costs no request and paints on the first frame, so the circle is never an
 * empty hole while the real file arrives. At 48-72px the blur is invisible —
 * it just looks like the image loaded instantly.
 */
const LQIP =
  "data:image/webp;base64,UklGRsQAAABXRUJQVlA4ILgAAACwBQCdASoUABQAPt1mq1EopSOiqAgBEBuJagCdMzE";

/** The exit animation has to finish before the dialog leaves the top layer. */
const EXIT_MS = 200;

export default function AvatarZoom({ alt }: { alt: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  // Gates the large file: nothing is fetched until the first open.
  const [everOpened, setEverOpened] = useState(false);

  const show = useCallback(() => {
    haptic();
    setEverOpened(true);
    // showModal, not an overlay div: it brings the top layer, a real backdrop,
    // focus trapping and Esc handling with it, none of which is worth
    // reimplementing or adding a dialog library for.
    dialogRef.current?.showModal();
    // One frame in the closed state before flipping, so the browser has
    // something to transition *from*. Setting it in the same tick risks the
    // paint landing already-open, which skips the animation entirely.
    requestAnimationFrame(() => setOpen(true));
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    // close() is synchronous and yanks the element out of the top layer, so it
    // waits for the exit to play rather than the dialog vanishing mid-fade.
    window.setTimeout(() => dialogRef.current?.close(), EXIT_MS);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={show}
        aria-label={`View ${alt} larger`}
        className="avatar-button block cursor-zoom-in rounded-full"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/avatar-144.webp"
          srcSet="/avatar-96.webp 96w, /avatar-144.webp 144w, /avatar-216.webp 216w, /avatar-288.webp 288w"
          // The rendered size at each breakpoint, so the browser picks the file
          // it actually needs rather than the largest one offered.
          sizes="(max-width: 639px) 72px, 48px"
          alt={alt}
          width={72}
          height={72}
          decoding="async"
          style={{ backgroundImage: `url(${LQIP})` }}
          className="h-[72px] w-[72px] rounded-full bg-cover object-cover sm:h-12 sm:w-12"
        />
      </button>

      <dialog
        ref={dialogRef}
        data-open={open}
        // Esc fires `cancel`; intercepting it routes the close through the
        // same exit animation as a click rather than snapping shut.
        onCancel={(event) => {
          event.preventDefault();
          hide();
        }}
        // The dialog element fills the viewport, so a click that lands on it
        // rather than on the figure is a click on the backdrop.
        onClick={(event) => {
          if (event.target === dialogRef.current) hide();
        }}
        className="avatar-dialog"
        aria-label={alt}
      >
        {everOpened ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/avatar-1024.webp"
            alt={alt}
            width={1024}
            height={1024}
            className="avatar-dialog-img"
          />
        ) : null}
      </dialog>
    </>
  );
}

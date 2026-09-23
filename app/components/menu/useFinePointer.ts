"use client";

import { useEffect, useState } from "react";

const QUERY = "(any-hover: hover) and (any-pointer: fine)";

/**
 * Whether this device drives a real pointer.
 *
 * Starts false on purpose. The server cannot know the pointer type, so
 * assuming touch and upgrading after mount keeps the first client render
 * identical to the prerendered HTML. The cost of being wrong for one frame is
 * a context menu that is briefly inert; the cost of the other default is a
 * hydration mismatch on every phone.
 */
export function useFinePointer(): boolean {
  const [fine, setFine] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(QUERY);
    const sync = () => setFine(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return fine;
}

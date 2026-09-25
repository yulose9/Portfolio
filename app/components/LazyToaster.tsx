"use client";

import dynamic from "next/dynamic";

/*
 * The toaster as its own chunk, fetched straight after hydration rather than
 * shipped in the first load. A toast only ever follows an action, and no one
 * acts faster than this loads; the manager (lib/toast) is tiny and already
 * there for anything that raises one.
 */
const Toaster = dynamic(() => import("./ui/toast").then((m) => m.Toaster), { ssr: false });

export default function LazyToaster() {
  return <Toaster />;
}

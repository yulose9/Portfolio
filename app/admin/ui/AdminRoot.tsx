"use client";

import dynamic from "next/dynamic";

// The editor (Tiptap, ProseMirror) is browser-only and heavy; the prerendered
// shell is just the loading state.
const AdminApp = dynamic(() => import("./AdminApp"), {
  ssr: false,
  loading: () => <div className="admin-loading" aria-busy="true" />,
});

export default function AdminRoot() {
  return <AdminApp />;
}

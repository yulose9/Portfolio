"use client";

import { Monitor, Moon, Sun } from "@phosphor-icons/react";
import dynamic from "next/dynamic";

import { useThemeSetting } from "../../components/ui/theme";
import { setThemeSetting } from "../../lib/theme";
import { useCommands } from "./registry";

// The editor (Tiptap, ProseMirror) is browser-only and heavy; the prerendered
// shell is just the loading state.
const AdminApp = dynamic(() => import("./AdminApp"), {
  ssr: false,
  loading: () => <div className="admin-loading" aria-busy="true" />,
});

const CI = { size: 16, "aria-hidden": true } as const;

/*
 * The theme's palette commands, registered once for the whole admin rather
 * than by the list or the editor, which each carry the toggle button. The
 * one that is in effect reads as checked, like the sound volume levels.
 */
function ThemeCommands() {
  const setting = useThemeSetting();
  useCommands(() =>
    ([
      ["light", "Light", Sun],
      ["dark", "Dark", Moon],
      ["system", "System", Monitor],
    ] as const).map(([id, label, Icon]) => ({
      id: `theme:${id}`,
      group: "View" as const,
      title: `Theme: ${label}`,
      checked: setting === id,
      icon: <Icon {...CI} />,
      keywords: ["theme", "dark", "light", "mode", "appearance", "colour", "color", "night"],
      run: () => setThemeSetting(id),
    }))
  );
  return null;
}

export default function AdminRoot() {
  return (
    <>
      <ThemeCommands />
      <AdminApp />
    </>
  );
}

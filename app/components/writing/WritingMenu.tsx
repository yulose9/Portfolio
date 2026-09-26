"use client";

import { ArrowSquareOut, Copy, House, LinkSimple, RssSimple } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Menu, MenuItem, MenuSeparator } from "../menu/ContextMenu";
import { copy, currentSelection, openUrl } from "../menu/actions";

/** Reuse the site's keyboard navigation, placement and touch fallback. */
export default function WritingMenu({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [selection, setSelection] = useState("");
  const [link, setLink] = useState("");

  return (
    <Menu
      onOpenChange={(open) => {
        if (open) setSelection(currentSelection());
      }}
      trigger={
        <div onContextMenuCapture={(event) => {
          const anchor = (event.target as Element).closest<HTMLAnchorElement>("a[href]");
          setLink(anchor?.href ?? "");
        }}>
          {children}
        </div>
      }
    >
      {selection ? <>
        <MenuItem icon={<Copy size={15} />} onClick={() => void copy(selection)}>Copy selected text</MenuItem>
        <MenuSeparator />
      </> : null}
      {link ? <>
        <MenuItem icon={<ArrowSquareOut size={15} />} onClick={() => openUrl(link)}>Open link in new tab</MenuItem>
        <MenuItem icon={<LinkSimple size={15} />} onClick={() => void copy(link, "Link copied")}>Copy link address</MenuItem>
        <MenuSeparator />
      </> : null}
      <MenuItem icon={<LinkSimple size={15} />} onClick={() => void copy("https://nazarene.dev/writing", "Writing link copied")}>Copy link to writing</MenuItem>
      <MenuItem icon={<RssSimple size={15} />} onClick={() => void copy("https://nazarene.dev/feed.xml", "RSS link copied")}>Copy RSS feed link</MenuItem>
      <MenuSeparator />
      <MenuItem icon={<House size={15} />} onClick={() => router.push("/")}>Back to home</MenuItem>
    </Menu>
  );
}

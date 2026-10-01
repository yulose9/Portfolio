"use client";

import {
  ArrowSquareOut,
  Code,
  Copy,
  Cursor,
  PawPrint,
  EnvelopeSimple,
  LinkSimple,
  MagnifyingGlass,
  Quotes,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { peersHidden, setPeersHidden } from "../PeerCursors";
import { setShibaStill, shibaStill } from "../ShibaPet";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./ContextMenu";
import { LINKS, copy, currentSelection, openEmail, openUrl, searchWeb } from "./actions";

const ICON = 15;

/**
 * The page-wide menu, and the one that reads the selection.
 *
 * Whether text is selected changes what a right-click should offer entirely —
 * "copy this page's link" is the wrong answer when someone has just highlighted
 * a sentence. The selection is read as the menu opens rather than being
 * tracked continuously, because it only matters at that instant.
 *
 * Row menus nest inside this one. The innermost trigger handles the event, so
 * right-clicking a job gets the job's menu and right-clicking beside it gets
 * this.
 */
export default function PageMenu({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState("");
  // Replacing the browser's menu everywhere must not cost the link actions it
  // had: right-clicking a link here still offers to open or copy it.
  const [link, setLink] = useState<string | null>(null);
  const [hidePeers, setHidePeers] = useState(false);
  const [still, setStill] = useState(false);
  const pointed = useRef<string | null>(null);

  useEffect(() => {
    const onContext = (event: MouseEvent) => {
      const a = (event.target as Element | null)?.closest?.<HTMLAnchorElement>("a[href]");
      pointed.current = a ? a.href : null;
    };
    document.addEventListener("contextmenu", onContext, true);
    return () => document.removeEventListener("contextmenu", onContext, true);
  }, []);

  return (
    <Menu
      onOpenChange={(open) => {
        if (!open) return;
        setSelection(currentSelection());
        setLink(pointed.current);
        setHidePeers(peersHidden());
        setStill(shibaStill());
      }}
      trigger={children}
    >
      {selection ? (
        <>
          <MenuLabel>Selection</MenuLabel>
          <MenuItem icon={<Copy size={ICON} />} onClick={() => void copy(selection)}>
            Copy
          </MenuItem>
          <MenuItem
            icon={<MagnifyingGlass size={ICON} />}
            onClick={() => searchWeb(selection)}
          >
            Search the web
          </MenuItem>
          <MenuItem
            icon={<Quotes size={ICON} />}
            onClick={() =>
              openEmail(
                "About your site",
                // Quoted so the reply arrives with its own context attached.
                `> ${selection}\n\n`
              )
            }
          >
            Quote in an email
          </MenuItem>
          <MenuSeparator />
        </>
      ) : null}

      {link ? (
        <>
          <MenuLabel>Link</MenuLabel>
          <MenuItem icon={<ArrowSquareOut size={ICON} />} onClick={() => window.open(link, "_blank", "noopener")}>
            Open in new tab
          </MenuItem>
          <MenuItem icon={<LinkSimple size={ICON} />} onClick={() => void copy(link, "Link copied")}>
            Copy link address
          </MenuItem>
          <MenuSeparator />
        </>
      ) : null}

      <MenuItem
        icon={<LinkSimple size={ICON} />}
        onClick={() => void copy(LINKS.SITE, "Link copied")}
      >
        Copy link to page
      </MenuItem>
      <MenuItem icon={<Code size={ICON} />} onClick={() => openUrl(LINKS.REPO, "the source on GitHub")}>
        View source
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={<EnvelopeSimple size={ICON} />} onClick={() => openEmail()}>
        Email me
      </MenuItem>
      <MenuSeparator />
      {/* Other visitors' pointers move on their own; this is how to stop that. */}
      <MenuItem icon={<Cursor size={ICON} />} onClick={() => setPeersHidden(!hidePeers)}>
        {hidePeers ? "Show other visitors’ cursors" : "Hide other visitors’ cursors"}
      </MenuItem>
      {/* The Shiba idles forever (wags, blinks, glances); this keeps it still. */}
      <MenuItem icon={<PawPrint size={ICON} />} onClick={() => setShibaStill(!still)}>
        {still ? "Let the Shiba move" : "Keep the Shiba still"}
      </MenuItem>
    </Menu>
  );
}

"use client";

import {
  Code,
  Copy,
  EnvelopeSimple,
  LinkSimple,
  MagnifyingGlass,
  Quotes,
} from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";
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

  return (
    <Menu
      onOpenChange={(open) => {
        if (open) setSelection(currentSelection());
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

      <MenuItem
        icon={<LinkSimple size={ICON} />}
        onClick={() => void copy(LINKS.SITE)}
      >
        Copy link to page
      </MenuItem>
      <MenuItem icon={<Code size={ICON} />} onClick={() => openUrl(LINKS.REPO)}>
        View source
      </MenuItem>
      <MenuSeparator />
      <MenuItem icon={<EnvelopeSimple size={ICON} />} onClick={() => openEmail()}>
        Email me
      </MenuItem>
    </Menu>
  );
}

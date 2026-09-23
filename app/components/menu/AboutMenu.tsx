"use client";

import { Copy, EnvelopeSimple, FileArrowDown } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./ContextMenu";
import { LINKS, copy, openEmail, openUrl } from "./actions";

const ICON = 15;

/**
 * The About section's menu.
 *
 * The bio is the one piece of prose on the site someone might genuinely want
 * whole — for an introduction, a speaker bio, a directory entry — and selecting
 * three paragraphs by hand to get it is a chore. This hands it over in one go.
 */
export default function AboutMenu({
  bio,
  resumeHref,
  children,
}: {
  bio: string;
  resumeHref?: string;
  children: ReactNode;
}) {
  return (
    <Menu trigger={children}>
      <MenuLabel>About</MenuLabel>
      <MenuItem icon={<Copy size={ICON} />} onClick={() => void copy(bio)}>
        Copy bio
      </MenuItem>
      <MenuItem
        icon={<Copy size={ICON} />}
        onClick={() => void copy(LINKS.EMAIL)}
      >
        Copy email address
      </MenuItem>
      <MenuSeparator />
      {resumeHref ? (
        <MenuItem
          icon={<FileArrowDown size={ICON} />}
          onClick={() => openUrl(resumeHref)}
        >
          Download résumé
        </MenuItem>
      ) : null}
      <MenuItem icon={<EnvelopeSimple size={ICON} />} onClick={() => openEmail()}>
        Email me
      </MenuItem>
    </Menu>
  );
}

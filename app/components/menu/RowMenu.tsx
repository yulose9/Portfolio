"use client";

import {
  ArrowSquareOut,
  Buildings,
  Copy,
  SealCheck,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import type { Entry } from "../../site-content";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./ContextMenu";
import { copy, openUrl } from "./actions";

const ICON = 15;

/**
 * The menu for a single row, shaped by which list it belongs to.
 *
 * A job, a certificate and a project want different verbs for the same
 * gesture: a certificate is something to verify, a job is somewhere to read
 * about, a project is something to open. The kind comes from the active tab
 * rather than being inferred from which optional fields happen to be set,
 * which would quietly break the first time an entry gained a logo.
 */
export default function RowMenu({
  entry,
  kind,
  children,
}: {
  entry: Entry;
  kind: string;
  children: ReactNode;
}) {
  const { title, company, year, href } = entry;

  return (
    <Menu trigger={children}>
      <MenuLabel>{title}</MenuLabel>

      {kind === "certificates" && href ? (
        <MenuItem icon={<SealCheck size={ICON} />} onClick={() => openUrl(href)}>
          Verify credential
        </MenuItem>
      ) : null}

      {kind === "work" && href ? (
        <MenuItem icon={<Buildings size={ICON} />} onClick={() => openUrl(href)}>
          Visit {company ?? "company"}
        </MenuItem>
      ) : null}

      {kind === "projects" && href ? (
        <MenuItem
          icon={<ArrowSquareOut size={ICON} />}
          onClick={() => openUrl(href)}
        >
          Open project
        </MenuItem>
      ) : null}

      {href ? <MenuSeparator /> : null}

      <MenuItem icon={<Copy size={ICON} />} onClick={() => void copy(title)}>
        Copy {kind === "certificates" ? "credential name" : "title"}
      </MenuItem>

      {company ? (
        <MenuItem icon={<Copy size={ICON} />} onClick={() => void copy(company)}>
          Copy {kind === "certificates" ? "issuer" : "company"}
        </MenuItem>
      ) : null}

      <MenuItem
        icon={<Copy size={ICON} />}
        onClick={() =>
          // The whole row as one line, which is what someone pasting it into a
          // message or a CV actually wants.
          void copy([title, company, year].filter(Boolean).join(" · "))
        }
      >
        Copy all details
      </MenuItem>
    </Menu>
  );
}

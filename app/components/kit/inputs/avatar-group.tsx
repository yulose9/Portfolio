"use client";

import { Avatar } from "@base-ui/react/avatar";
import { Tooltip } from "@base-ui/react/tooltip";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import { cn } from "../../../lib/cn";

/*
 * Faces in a row, overlapping, each lifting on hover with its name in a
 * tooltip (shadcn.io's avatar group), and a +N chip for the rest that names
 * them all. Every face is a tab stop so the names are reachable from the
 * keyboard too, not only by mouse.
 *
 * The overlap is a mask, not a border: each face after the first has a bite
 * taken out where the previous one sits, so the ring stays clean on any
 * background. A person can bring their own picture (`avatar`, e.g. the
 * writing Avatar with its generated styles); otherwise it is the photo, then
 * initials.
 */

export type Person = {
  id?: string;
  name: string;
  src?: string;
  /** A ready-made face, used instead of src/initials. */
  avatar?: ReactNode;
};

export type AvatarGroupProps = {
  people: readonly Person[];
  /** Faces shown before the +N chip. */
  max?: number;
  size?: number;
  /** The group's name, e.g. "Authors". Defaults to a count. */
  label?: string;
  onSelect?: (person: Person) => void;
  className?: string;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

function Face({ person, size }: { person: Person; size: number }) {
  if (person.avatar) return <span className="ki-avatar">{person.avatar}</span>;
  return (
    <Avatar.Root className="ki-avatar" style={{ width: size, height: size }}>
      {person.src ? <Avatar.Image src={person.src} alt="" width={size} height={size} /> : null}
      <Avatar.Fallback className="ki-avatar-fallback" delay={person.src ? 300 : 0}>
        {initials(person.name)}
      </Avatar.Fallback>
    </Avatar.Root>
  );
}

function Tip({ children, content }: { children: ReactElement; content: ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={120} closeDelay={0} render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={8} side="top" className="ki-positioner">
          <Tooltip.Popup className="ki-tooltip">{content}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function AvatarGroup({ people, max = 4, size = 32, label, onSelect, className }: AvatarGroupProps) {
  // Showing three and "+1" spends the chip on a single face; show the face.
  const shown = people.length > max + 1 ? people.slice(0, max) : people;
  const rest = people.slice(shown.length);

  return (
    <Tooltip.Provider delay={120}>
      <div
        role="group"
        data-slot="avatar-group"
        aria-label={label ?? `${people.length} ${people.length === 1 ? "person" : "people"}`}
        className={cn("ki-avatar-group", className)}
        style={{ "--avatar-size": `${size}px` } as CSSProperties}
      >
        {shown.map((person, i) => (
          <Tip key={person.id ?? person.name} content={person.name}>
            <button
              type="button"
              data-slot="avatar-group-item"
              className="ki-avatar-slot"
              data-first={i === 0 || undefined}
              aria-label={person.name}
              onClick={() => onSelect?.(person)}
              style={{ zIndex: shown.length - i }}
            >
              <Face person={person} size={size} />
            </button>
          </Tip>
        ))}
        {rest.length ? (
          <Tip
            content={
              <ul className="ki-tooltip-list">
                {rest.map((p) => (
                  <li key={p.id ?? p.name}>{p.name}</li>
                ))}
              </ul>
            }
          >
            <button
              type="button"
              data-slot="avatar-group-overflow"
              className="ki-avatar-slot ki-avatar-more"
              aria-label={`${rest.length} more: ${rest.map((p) => p.name).join(", ")}`}
            >
              +{rest.length}
            </button>
          </Tip>
        ) : null}
      </div>
    </Tooltip.Provider>
  );
}

export default AvatarGroup;

"use client";

import { Children, isValidElement, useEffect } from "react";

import { useTravellingHighlight } from "../useTravellingHighlight";

/*
 * A list whose rows share the home page's travelling glass highlight: one
 * surface that glides to the row under the pointer (or keyboard focus) and
 * resizes to it. Each child is one row; the server renders the rows, this only
 * adds the surface and the listeners.
 *
 * `start` continues the page's entrance cascade (.panel-chunk's --i), so rows
 * arrive in step with whatever came before them.
 */
export default function HighlightList({
  className,
  start = 0,
  children,
}: {
  className?: string;
  start?: number;
  children: React.ReactNode;
}) {
  const { hovered, rowRefs, highlightRef, enter, wrapperProps } = useTravellingHighlight();
  const rows = Children.toArray(children);

  // A resize changes the rows' size; refit the glass to the row it is on.
  useEffect(() => {
    if (hovered === null) return;
    const refit = () => enter(hovered);
    window.addEventListener("resize", refit);
    return () => window.removeEventListener("resize", refit);
  }, [hovered, enter]);

  return (
    <div className="wi-hl" {...wrapperProps}>
      <div
        ref={highlightRef}
        aria-hidden="true"
        className={`list-highlight pointer-events-none absolute left-0 top-0 rounded-[14px] ${
          hovered === null ? "is-idle opacity-0" : "opacity-100"
        }`}
      />
      <ul className={className}>
        {rows.map((row, i) => (
          <li
            key={isValidElement(row) && row.key != null ? row.key : i}
            ref={(node) => {
              rowRefs.current[i] = node;
            }}
            className="panel-chunk relative"
            style={{ "--i": start + i } as React.CSSProperties}
            onPointerEnter={() => enter(i)}
            onFocus={() => enter(i)}
          >
            {row}
          </li>
        ))}
      </ul>
    </div>
  );
}

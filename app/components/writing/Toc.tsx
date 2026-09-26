"use client";
import { useEffect, useRef } from "react";
import type { OutlineItem } from "../../lib/writing";

/**
 * On wide screens, a quiet right rail; on smaller screens, a sticky
 * disclosure above the body. The section you're reading is
 * marked by the enhancement island (data-active), so the markup is complete
 * without script.
 */
export default function Toc({ items }: { items: OutlineItem[] }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const viewport = disclosure.current?.ownerDocument.defaultView;
    if (!viewport) return;
    const wide = viewport.matchMedia("(min-width: 1440px)");
    const sync = () => { if (disclosure.current) disclosure.current.open = wide.matches; };
    sync();
    wide.addEventListener("change", sync);
    return () => wide.removeEventListener("change", sync);
  }, []);
  return (
    <div className="toc-rail">
      <nav className="toc" aria-label="On this page">
        <details ref={disclosure} open>
        <summary className="toc-title">On this page <span aria-hidden="true">⌄</span></summary>
        <ol>
          {items.map((item) => (
            <li key={item.id} data-depth={item.depth}>
              <a href={`#${item.id}`} data-toc-link={item.id} onClick={(event) => {
                const width = event.currentTarget.ownerDocument.defaultView?.innerWidth ?? 0;
                if (width < 1440 && disclosure.current) disclosure.current.open = false;
              }}>
                {item.text}
              </a>
            </li>
          ))}
        </ol>
        </details>
      </nav>
    </div>
  );
}

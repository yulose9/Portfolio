"use client";
import { safeInlineUrl } from "../../../cms/inline";
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
    const doc=disclosure.current!.ownerDocument;
    let frame=0;
    const update=()=>{
      frame=0;
      const heads=items.map(item=>doc.getElementById(item.id)).filter((h):h is HTMLElement=>Boolean(h));
      let current=heads[0];for(const head of heads)if(head.getBoundingClientRect().top<viewport.innerHeight*.3)current=head;
      const list=disclosure.current?.querySelector("ol");
      disclosure.current?.querySelectorAll<HTMLAnchorElement>("[data-toc-link]").forEach(link=>{
        const active=link.dataset.tocLink===current?.id;link.toggleAttribute("data-active",active);
        if(active){link.setAttribute("aria-current","location");if(list && disclosure.current?.open){const r=link.getBoundingClientRect(),lr=list.getBoundingClientRect();if(r.top<lr.top)list.scrollTop-=lr.top-r.top+8;else if(r.bottom>lr.bottom)list.scrollTop+=r.bottom-lr.bottom+8;}}
        else link.removeAttribute("aria-current");
      });
    };
    const scroll=()=>{if(!frame)frame=viewport.requestAnimationFrame(update);};
    viewport.addEventListener("scroll",scroll,{passive:true});update();
    wide.addEventListener("change", sync);
    return () => {wide.removeEventListener("change", sync);viewport.removeEventListener("scroll",scroll);viewport.cancelAnimationFrame(frame);};
  }, [items]);
  return (
    <div className="toc-rail">
      <nav className="toc" aria-label="On this page">
        <details ref={disclosure} open>
        <summary className="toc-title">On this page <span aria-hidden="true">⌄</span></summary>
        <ol data-lenis-prevent>
          {items.map((item) => (
            <li key={item.id} data-depth={item.depth}>
              <a href={`#${item.id}`} data-toc-link={item.id} onClick={(event) => {
                event.preventDefault();
                const doc=event.currentTarget.ownerDocument;
                const viewport=doc.defaultView;
                const width = event.currentTarget.ownerDocument.defaultView?.innerWidth ?? 0;
                if (width < 1440 && disclosure.current) disclosure.current.open = false;
                // A history entry, so Back returns to where the reader was.
                viewport?.history.pushState(null,"",`#${item.id}`);
                viewport?.requestAnimationFrame(()=>{
                  const head=doc.getElementById(item.id);
                  if(!head)return;
                  head.scrollIntoView({block:"start",behavior:viewport.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
                  // Focus follows the jump, so the next Tab continues from the
                  // section rather than from inside the contents list.
                  if(!head.hasAttribute("tabindex"))head.tabIndex=-1;
                  head.focus({preventScroll:true});
                });
              }}>
                {item.icon ? <span className="toc-icon" aria-hidden="true">{safeInlineUrl(item.icon,true) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={safeInlineUrl(item.icon,true)} alt="" />
                ) : item.icon}</span> : null}{item.text}
              </a>
            </li>
          ))}
        </ol>
        </details>
      </nav>
    </div>
  );
}

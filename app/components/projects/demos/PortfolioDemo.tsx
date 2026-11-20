"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";

export type PortfolioDemoData = {
  name: string;
  role: string;
  avatar: string;
  tabs: { label: string; rows: { title: string; sub: string; meta: string }[] }[];
};

/*
 * The home page's two signature motions, in miniature and with the real
 * content: a pill that travels between tabs, and a highlight that travels
 * between rows (morphing to each row's width, the way the home list does).
 * Not the site rebuilt, only the moments worth showing.
 */
export default function PortfolioDemo({ data }: { data: PortfolioDemoData }) {
  const [tab, setTab] = useState(0);
  const [row, setRow] = useState<number | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const pillRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  // Geometry goes straight to the two surfaces: it is presentation, measured
  // from the laid-out tabs and rows, so it never needs to be React state.
  useLayoutEffect(() => {
    const el = tabRefs.current[tab];
    const pill = pillRef.current;
    if (el && pill) {
      pill.style.transform = `translateX(${el.offsetLeft}px)`;
      pill.style.width = `${el.offsetWidth}px`;
    }
  }, [tab]);

  useLayoutEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;
    const el = row === null ? null : rowRefs.current[row];
    glow.toggleAttribute("data-on", Boolean(el));
    if (el) {
      glow.style.transform = `translateY(${el.offsetTop}px)`;
      glow.style.width = `${el.offsetWidth}px`;
      glow.style.height = `${el.offsetHeight}px`;
    }
  }, [row, tab]);

  const rows = data.tabs[tab]?.rows ?? [];
  const id = useId();

  // The APG tabs pattern: one tab in the tab order, arrows move between them.
  const onTabKey = (event: React.KeyboardEvent) => {
    const last = data.tabs.length - 1;
    const next =
      event.key === "ArrowRight" ? (tab === last ? 0 : tab + 1)
      : event.key === "ArrowLeft" ? (tab === 0 ? last : tab - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (next === null) return;
    event.preventDefault();
    setTab(next);
    setRow(null);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="pf-demo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="pf-demo-avatar" src={data.avatar} alt="" width={84} height={84} />
      <p className="pf-demo-name" translate="no">
        {data.name}
      </p>
      <p className="pf-demo-role">{data.role}</p>

      <div className="pf-demo-tabs" role="tablist" aria-label="Sections">
        <span ref={pillRef} className="pf-demo-pill" aria-hidden="true" />
        {data.tabs.map((t, i) => (
          <button
            key={t.label}
            ref={(node) => {
              tabRefs.current[i] = node;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${i}`}
            aria-selected={i === tab}
            aria-controls={`${id}-panel`}
            tabIndex={i === tab ? 0 : -1}
            onKeyDown={onTabKey}
            className="pf-demo-tab"
            onClick={() => {
              setTab(i);
              setRow(null);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="pf-demo-listwrap" onPointerLeave={() => setRow(null)}>
      <span ref={glowRef} className="pf-demo-glow" aria-hidden="true" />
      <ul className="pf-demo-list" key={tab} id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`}>
        {rows.map((r, i) => (
          <li
            key={r.title}
            ref={(node) => {
              rowRefs.current[i] = node;
            }}
            className="pf-demo-row"
            onPointerEnter={() => setRow(i)}
            onClick={() => setRow(i)}
          >
            <span className="pf-demo-row-title">{r.title}</span>
            {r.sub ? <span className="pf-demo-row-sub">{r.sub}</span> : null}
            <span className="pf-demo-row-meta">{r.meta}</span>
          </li>
        ))}
      </ul>
      </div>
    </div>
  );
}

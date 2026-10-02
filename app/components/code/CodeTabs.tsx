"use client";

import { Tabs } from "@base-ui/react/tabs";
import { Children, useRef, useState } from "react";

import { codeText } from "./CodeBlock";
import CopyButton, { WrapButton } from "./CopyButton";

/*
 * Several code panes under one set of tabs: npm / pnpm / yarn, or the files
 * of one example. Every pane is in the HTML (keepMounted), so the code is
 * there without script and for search; the tabs only choose which shows.
 */

export type CodeTabsProps = { tabs: { label: string; language?: string }[]; children: React.ReactNode };

export default function CodeTabs({ tabs, children }: CodeTabsProps) {
  const panes = Children.toArray(children);
  const [value, setValue] = useState(0);
  const [wrapped, setWrapped] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const active = () => root.current?.querySelector<HTMLElement>(`[data-pane="${value}"]`) ?? null;

  return (
    <Tabs.Root
      ref={root}
      className="code-tabs"
      value={value}
      onValueChange={(v) => setValue(Number(v))}
      data-wrap={wrapped || undefined}
    >
      <div className="code-tabs-header">
        <Tabs.List className="code-tabs-list" aria-label="Code examples">
          {tabs.map((t, i) => (
            <Tabs.Tab key={i} value={i} className="code-tabs-tab">
              {t.label}
            </Tabs.Tab>
          ))}
          <Tabs.Indicator className="code-tabs-indicator" />
        </Tabs.List>
        <span className="code-block-actions">
          <WrapButton wrapped={wrapped} onToggle={() => setWrapped((w) => !w)} />
          <CopyButton text={() => codeText(active())} copiedTitle={`${tabs[value]?.label ?? "Code"} copied`} />
        </span>
      </div>
      {panes.map((pane, i) => (
        <Tabs.Panel key={i} value={i} keepMounted className="code-tabs-panel" data-pane={i}>
          {pane}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}

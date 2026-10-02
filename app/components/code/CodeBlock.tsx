"use client";

import { useRef, useState } from "react";

import CopyButton, { WrapButton } from "./CopyButton";
import { languageName } from "./languages";

/*
 * A code block as an artifact: a header with the file name (or the
 * language), then the code, already highlighted at build time by Shiki.
 * Line numbers and highlighted lines are drawn by CSS from the line spans
 * (app/article-blocks-2.css); wrapping is a reader's choice, per block.
 * `bare` drops the header, for a pane inside CodeTabs.
 */

export type CodeBlockProps = {
  language?: string;
  title?: string;
  lineNumbers?: boolean;
  bare?: boolean;
  children: React.ReactNode;
};

export const codeText = (root: Element | null) => (root?.querySelector("pre") as HTMLElement | null)?.innerText.replace(/\n$/, "") ?? "";

export default function CodeBlock({ language, title, lineNumbers, bare, children }: CodeBlockProps) {
  const body = useRef<HTMLDivElement>(null);
  const [wrapped, setWrapped] = useState(false);
  if (bare) return <div className="code-pane" data-line-numbers={lineNumbers || undefined}>{children}</div>;
  const lang = languageName(language);
  return (
    <div className="code-block" data-wrap={wrapped || undefined} data-line-numbers={lineNumbers || undefined}>
      <div className="code-block-header">
        <span className="code-block-title">
          {title ? <span className="code-block-file">{title}</span> : <span>{lang}</span>}
          {title && language ? <span className="code-block-lang">{lang}</span> : null}
        </span>
        <span className="code-block-actions">
          <WrapButton wrapped={wrapped} onToggle={() => setWrapped((w) => !w)} />
          <CopyButton text={() => codeText(body.current)} copiedTitle={title ? `${title} copied` : language ? `${lang} copied` : "Code copied"} />
        </span>
      </div>
      <div ref={body} className="code-block-body">
        {children}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { LinkSimple, Cards, X } from "@phosphor-icons/react";
import { Kbd } from "../../components/kit/kbd";

export type GithubPasteChoice = {
  url: string;
  owner: string;
  repo: string;
  format?: "repo" | "issue" | "pull" | "discussion";
  pos?: number;
};

function GithubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export default function GithubPastePrompt({
  pending,
  onChooseLink,
  onChooseEmbed,
  onCancel,
}: {
  pending: GithubPasteChoice;
  onChooseLink: () => void;
  onChooseEmbed: () => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<"embed" | "link">("embed");
  const embedBtnRef = useRef<HTMLButtonElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the recommended primary button by default
    embedBtnRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "1") {
        e.preventDefault();
        onChooseLink();
      } else if (e.key === "2") {
        e.preventDefault();
        onChooseEmbed();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        setSelected((prev) => {
          const next = prev === "embed" ? "link" : "embed";
          if (next === "link") linkBtnRef.current?.focus();
          else embedBtnRef.current?.focus();
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, onChooseEmbed, onChooseLink]);

  return (
    <div className="github-prompt-overlay" onClick={onCancel} role="presentation">
      <div
        className="github-prompt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-prompt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="github-prompt-close"
          onClick={onCancel}
          aria-label="Close and keep as link"
        >
          <X size={15} />
        </button>

        <div className="github-prompt-head">
          <div className="github-prompt-badge">
            <GithubIcon size={20} />
          </div>
          <div>
            <h4 id="github-prompt-title" className="github-prompt-title">
              GitHub Link Pasted
            </h4>
            <p className="github-prompt-url" title={pending.url}>
              {pending.owner}/{pending.repo}
            </p>
          </div>
        </div>

        <p className="github-prompt-question">How would you like to insert this?</p>

        <div className="github-prompt-choices">
          {/* Option 1: Just link text */}
          <button
            ref={linkBtnRef}
            type="button"
            className={`github-prompt-choice ${selected === "link" ? "is-selected" : ""}`}
            onClick={onChooseLink}
            onMouseEnter={() => setSelected("link")}
          >
            <div className="github-prompt-choice-top">
              <span className="github-prompt-choice-icon">
                <LinkSimple size={18} weight="bold" />
              </span>
              <span className="github-prompt-choice-kbd">
                <Kbd size="sm">1</Kbd>
              </span>
            </div>
            <strong className="github-prompt-choice-title">Paste as Link</strong>
            <span className="github-prompt-choice-hint">Standard plain link text</span>
          </button>

          {/* Option 2: Component Embed (Recommended) */}
          <button
            ref={embedBtnRef}
            type="button"
            className={`github-prompt-choice is-primary ${selected === "embed" ? "is-selected" : ""}`}
            onClick={onChooseEmbed}
            onMouseEnter={() => setSelected("embed")}
          >
            <div className="github-prompt-choice-top">
              <span className="github-prompt-choice-icon is-primary-icon">
                <Cards size={18} weight="fill" />
              </span>
              <span className="github-prompt-choice-kbd">
                <Kbd size="sm">↵ Enter</Kbd>
              </span>
            </div>
            <strong className="github-prompt-choice-title">Component Embed</strong>
            <span className="github-prompt-choice-hint">Interactive card with stars & forks</span>
          </button>
        </div>

        <div className="github-prompt-foot">
          <span>Press <Kbd size="sm">1</Kbd> for link or <Kbd size="sm">2</Kbd> for embed</span>
        </div>
      </div>
    </div>
  );
}

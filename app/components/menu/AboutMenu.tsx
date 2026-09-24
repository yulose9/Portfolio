"use client";

import {
  BookOpenText,
  Copy,
  EnvelopeSimple,
  FileArrowDown,
  MagnifyingGlass,
  Paragraph,
  Quotes,
  SpeakerHigh,
  SpeakerSlash,
  TextAlignLeft,
  XLogo,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./ContextMenu";
import { LINKS, copy, currentSelection, openEmail, openUrl, searchWeb } from "./actions";

const ICON = 15;
const NAME = "John Nazarene Dela Pisa";

/** X counts a link as 23 characters; this leaves room for it and the quotes. */
const TWEET_QUOTE_MAX = 240;

/** One word — letters, apostrophes, hyphens — is worth offering a definition. */
const SINGLE_WORD = /^[\p{L}'’-]{2,}$/u;

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * The About section's menu.
 *
 * What it offers depends on what the right-click landed on, read at the
 * instant the menu opens: highlighted text gets ways to use that text, and
 * the paragraph under the pointer can be taken on its own. The bio is the one
 * piece of prose on the site someone might genuinely want — for an
 * introduction, a speaker bio, a directory entry — so it is always one click
 * away, whole.
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
  const [selection, setSelection] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [speaking, setSpeaking] = useState(false);
  // Written by the contextmenu event, which fires before the menu opens.
  const target = useRef("");

  // Leaving the tab stops a reading in progress rather than orphaning it.
  useEffect(() => () => {
    if (canSpeak()) window.speechSynthesis.cancel();
  }, []);

  const readAloud = () => {
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(bio);
    utterance.lang = "en";
    utterance.rate = 1;
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
    setSpeaking(true);
  };

  const quote = (text: string) => `“${text}” — ${NAME} (nazarene.dev)`;

  const shareOnX = (text: string) => {
    const trimmed = text.length > TWEET_QUOTE_MAX ? `${text.slice(0, TWEET_QUOTE_MAX - 1).trimEnd()}…` : text;
    const params = new URLSearchParams({ text: `“${trimmed}”`, url: LINKS.SITE });
    openUrl(`https://x.com/intent/post?${params}`);
  };

  const word = SINGLE_WORD.test(selection) ? selection : "";

  return (
    <Menu
      onOpenChange={(open) => {
        if (!open) return;
        setSelection(currentSelection());
        setParagraph(target.current);
        setSpeaking(canSpeak() && window.speechSynthesis.speaking);
      }}
      trigger={
        <div
          className="contents"
          onContextMenuCapture={(event) => {
            const p = (event.target as Element).closest?.("p");
            target.current = p?.textContent?.trim() ?? "";
          }}
        >
          {children}
        </div>
      }
    >
      {selection ? (
        <>
          <MenuLabel>Selection</MenuLabel>
          <MenuItem icon={<Copy size={ICON} />} onClick={() => void copy(selection)}>
            Copy
          </MenuItem>
          <MenuItem icon={<Quotes size={ICON} />} onClick={() => void copy(quote(selection))}>
            Copy as quote
          </MenuItem>
          <MenuItem icon={<XLogo size={ICON} />} onClick={() => shareOnX(selection)}>
            Share quote on X
          </MenuItem>
          {word ? (
            <MenuItem
              icon={<BookOpenText size={ICON} />}
              onClick={() => searchWeb(`define ${word}`)}
            >
              Define “{word}”
            </MenuItem>
          ) : (
            <MenuItem
              icon={<MagnifyingGlass size={ICON} />}
              onClick={() => searchWeb(selection)}
            >
              Search the web
            </MenuItem>
          )}
          <MenuSeparator />
        </>
      ) : null}

      <MenuLabel>About</MenuLabel>
      {/* Only when the right-click landed on a paragraph, and it is not
          already covered by a selection of that same text. */}
      {paragraph && paragraph !== selection ? (
        <MenuItem icon={<Paragraph size={ICON} />} onClick={() => void copy(paragraph)}>
          Copy this paragraph
        </MenuItem>
      ) : null}
      <MenuItem icon={<TextAlignLeft size={ICON} />} onClick={() => void copy(bio)}>
        Copy full bio
      </MenuItem>
      {canSpeak() ? (
        <MenuItem
          icon={speaking ? <SpeakerSlash size={ICON} /> : <SpeakerHigh size={ICON} />}
          onClick={readAloud}
        >
          {speaking ? "Stop reading" : "Read bio aloud"}
        </MenuItem>
      ) : null}

      <MenuSeparator />
      <MenuItem icon={<Copy size={ICON} />} onClick={() => void copy(LINKS.EMAIL)}>
        Copy email address
      </MenuItem>
      <MenuItem icon={<EnvelopeSimple size={ICON} />} onClick={() => openEmail()}>
        Email me
      </MenuItem>
      {resumeHref ? (
        <MenuItem icon={<FileArrowDown size={ICON} />} onClick={() => openUrl(resumeHref)}>
          Download résumé
        </MenuItem>
      ) : null}
    </Menu>
  );
}

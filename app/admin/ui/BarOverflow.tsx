"use client";

import { BookOpenText, ClockCounterClockwise, MagnifyingGlass, Monitor, Moon, SlidersHorizontal, SpeakerHigh, SpeakerNone, Sun } from "@phosphor-icons/react";

import { setSoundMuted, useSoundMuted } from "../../components/ui/sound";
import { useThemeSetting } from "../../components/ui/theme";
import { nextSetting, setThemeSetting, type ThemeSetting } from "../../lib/theme";
import { keys, MItem, MSep } from "./menu";
import { shortcutLabel } from "./shortcuts";

/*
 * The editor bar's buttons that fold into its "More" menu when the bar runs
 * out of room. The bar decides that with a container query, which a portalled
 * menu can't see, so the menu asks the bar on open (see useBarOverflow) and
 * shows only what the bar is hiding: nothing is ever in both places.
 */

const THEME_LABEL: Record<ThemeSetting, string> = { system: "System", light: "Light", dark: "Dark" };
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon } as const;

export type BarOverflow = { details: boolean; extras: boolean };

/** Reads which of the bar's groups its container queries have hidden. */
export function readBarOverflow(bar: HTMLElement | null): BarOverflow {
  const hidden = (selector: string) => {
    const el = bar?.querySelector<HTMLElement>(selector);
    return el ? getComputedStyle(el).display === "none" : false;
  };
  return { details: hidden(".editor-bar-details"), extras: hidden(".editor-bar-extra") };
}

export function BarOverflowItems({
  overflow,
  onDetails,
  onFind,
  onResearch,
  onHistory,
}: {
  overflow: BarOverflow;
  onDetails: () => void;
  onFind: () => void;
  onResearch: () => void;
  onHistory: () => void;
}) {
  const muted = useSoundMuted();
  const theme = useThemeSetting();
  const ThemeIcon = THEME_ICON[theme];
  if (!overflow.details && !overflow.extras) return null;

  return (
    <>
      {overflow.details ? (
        <MItem icon={<SlidersHorizontal size={15} />} keys={keys(shortcutLabel("details"))} onSelect={onDetails}>
          Details
        </MItem>
      ) : null}
      {overflow.extras ? (
        <>
          <MItem icon={<MagnifyingGlass size={15} />} keys={keys(shortcutLabel("find"))} onSelect={onFind}>
            Find in this post
          </MItem>
          <MItem icon={<BookOpenText size={15} />} onSelect={onResearch}>
            Research and references
          </MItem>
          <MItem icon={<ClockCounterClockwise size={15} />} onSelect={onHistory}>
            History
          </MItem>
          <MItem icon={muted ? <SpeakerNone size={15} /> : <SpeakerHigh size={15} />} onSelect={() => setSoundMuted(!muted)} closeOnClick={false}>
            {muted ? "Turn sounds on" : "Mute sounds"}
          </MItem>
          <MItem icon={<ThemeIcon size={15} />} onSelect={() => setThemeSetting(nextSetting(theme))} closeOnClick={false}>
            Theme: {THEME_LABEL[theme]}
          </MItem>
        </>
      ) : null}
      <MSep />
    </>
  );
}

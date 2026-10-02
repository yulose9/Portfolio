"use client";

import { Monitor, Moon, Sun } from "@phosphor-icons/react";
import { useEffect, useSyncExternalStore } from "react";

import { cn } from "../../lib/cn";
import {
  applyTheme,
  getThemeSetting,
  nextSetting,
  setThemeSetting,
  subscribeTheme,
  type ThemeSetting,
} from "../../lib/theme";

/*
 * The theme control, and the hook behind it.
 *
 * The pre-paint script in each root layout already put the right theme on
 * <html>; everything here is about changing it afterwards. The server renders
 * the System icon (it can't know the choice), and the client corrects it
 * straight after hydration, which useSyncExternalStore handles without a
 * mismatch warning.
 */

export function useThemeSetting(): ThemeSetting {
  return useSyncExternalStore(subscribeTheme, getThemeSetting, () => "system");
}

/*
 * Mounted once per root layout, so System follows the OS (and another tab's
 * choice) on every page, including the ones without a toggle on them.
 */
export function ThemeSync() {
  useEffect(() => {
    applyTheme(getThemeSetting());
    return subscribeTheme(() => {});
  }, []);
  return null;
}

const LABEL: Record<ThemeSetting, string> = { system: "System", light: "Light", dark: "Dark" };
const ICON = { system: Monitor, light: Sun, dark: Moon } as const;

/*
 * One small button that steps System → Light → Dark. It shows the current
 * setting, and its label says what the next press does. The three icons sit
 * on top of each other and cross-fade, so the swap reads as one control
 * changing state rather than a new button appearing.
 */
export function ThemeToggle({ className, onClick, ...props }: React.ComponentProps<"button">) {
  const setting = useThemeSetting();
  const next = nextSetting(setting);

  return (
    <button
      type="button"
      aria-label={`Theme: ${LABEL[setting]}. Switch to ${LABEL[next]}`}
      title={`Theme: ${LABEL[setting]}`}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setThemeSetting(next);
      }}
      data-sound="swoosh"
      data-slot="theme-toggle"
      {...props}
      className={cn(
        "relative flex size-7 cursor-pointer items-center justify-center rounded text-shell-fg-faint transition-[transform,box-shadow] duration-100 ease-out outline-none hover:bg-black/5 hover:text-shell-fg-muted focus-visible:ring-2 focus-visible:ring-black/70 active:scale-[0.96] motion-reduce:transition-none dark:hover:bg-white/10 dark:focus-visible:ring-white/70",
        className
      )}
    >
      {(Object.keys(ICON) as ThemeSetting[]).map((key) => {
        const Icon = ICON[key];
        const on = key === setting;
        return (
          <Icon
            key={key}
            size={17}
            aria-hidden
            className={cn(
              "absolute transition-[opacity,transform,filter] duration-200 ease-out motion-reduce:transition-none",
              on ? "scale-100 opacity-100 blur-0" : "scale-[0.25] opacity-0 blur-[4px]"
            )}
          />
        );
      })}
    </button>
  );
}

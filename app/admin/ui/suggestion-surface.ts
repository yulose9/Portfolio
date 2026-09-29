import type { SuggestionProps } from "@tiptap/suggestion";

/** Let Tiptap own the anchor and listeners; constrain the surface to the visual viewport. */
export function mountSuggestion(
  props: Pick<SuggestionProps, "mount">,
  element: HTMLElement,
) {
  element.classList.add("slash-layer");
  element.setAttribute("data-lenis-prevent", "");
  element.style.visibility = "hidden";
  return props.mount(element, {
    onPosition: ({ x, y, strategy }) => {
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0,
        top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth,
        height = viewport?.height ?? window.innerHeight;
      element.style.setProperty(
        "--suggestion-height",
        `${Math.max(0, height - 24)}px`,
      );
      element.style.setProperty(
        "--suggestion-width",
        `${Math.max(0, width - 24)}px`,
      );
      element.style.position = strategy;
      element.style.left = `${Math.max(left + 12, Math.min(x, left + width - element.offsetWidth - 12))}px`;
      element.style.top = `${Math.max(top + 12, Math.min(y, top + height - element.offsetHeight - 12))}px`;
      element.style.visibility = "";
    },
  });
}

/** Scroll only the options pane, never the document or the popup anchor. */
export function revealOption(list: HTMLElement | null, index: number) {
  const item = list?.querySelector<HTMLElement>(`[data-index="${index}"]`);
  if (!list || !item) return;
  const box = list.getBoundingClientRect(),
    row = item.getBoundingClientRect();
  if (row.top < box.top) list.scrollTop -= box.top - row.top;
  else if (row.bottom > box.bottom) list.scrollTop += row.bottom - box.bottom;
}

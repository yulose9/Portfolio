import { fontHref } from "../../../cms/fonts";
import type { FontChoice } from "../../../cms/format";
export function loadFont(font: FontChoice | null | undefined) {
  const href = font ? fontHref(font) : null;
  if (
    href &&
    !document.querySelector(`link[data-font="${CSS.escape(href)}"]`)
  ) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.font = href;
    document.head.appendChild(link);
  }
}

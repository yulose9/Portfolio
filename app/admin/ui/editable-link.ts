/** Atom node views (page/date mentions and logos) own their click behavior. */
export function editableLink(root: HTMLElement, target: EventTarget | null): HTMLAnchorElement | null {
  const element = target as Element | null;
  const link = element?.closest?.<HTMLAnchorElement>("a[href]");
  return link && root.contains(link) && !link.closest('[contenteditable="false"]') ? link : null;
}

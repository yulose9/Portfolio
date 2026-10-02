/*
 * A table wider than its frame scrolls sideways inside it. This keeps the
 * frame told which way there's more to see, so its edge fades show only
 * on a side you can actually scroll toward:
 *
 *   data-scrollable    the table is wider than the frame
 *   data-scroll-start  there's more to the left (to the start)
 *   data-scroll-end    there's more to the right (to the end)
 *
 * While the table does scroll, the scroller is a focusable, labelled region
 * so a keyboard can land on it and move it with the arrow keys; when it
 * fits again it goes back to being plain. A mouse wheel held with Shift
 * scrolls it sideways (some browsers don't do that on their own); a plain
 * wheel is never caught, so the page keeps scrolling past it.
 *
 * Plain DOM: used by the article (ArticleEnhance), the data table and the
 * editor's table view.
 */

type Options = {
  /** The element the data-scroll-* attributes go on (the frame). Defaults to the scroller's parent. */
  frame?: HTMLElement;
  /** The region's name for screen readers; false keeps it out of the tab order (inside the editor). */
  label?: string | false;
};

export function scrollEdges(scroller: HTMLElement, { frame = scroller.parentElement ?? scroller, label = "Table" }: Options = {}): () => void {
  let raf = 0;
  // Only the attributes this put on are taken off again.
  let owned = false;

  const update = () => {
    raf = 0;
    const max = scroller.scrollWidth - scroller.clientWidth;
    const scrollable = max > 1;
    // scrollLeft runs negative in right-to-left text.
    const x = Math.abs(scroller.scrollLeft);
    frame.toggleAttribute("data-scrollable", scrollable);
    frame.toggleAttribute("data-scroll-start", scrollable && x > 1);
    frame.toggleAttribute("data-scroll-end", scrollable && x < max - 1);
    if (label === false) return;
    if (scrollable && !owned && !scroller.hasAttribute("tabindex")) {
      scroller.tabIndex = 0;
      scroller.setAttribute("role", "region");
      scroller.setAttribute("aria-label", `${label}, scrolls sideways`);
      owned = true;
    } else if (!scrollable && owned) {
      release();
    }
  };
  const release = () => {
    scroller.removeAttribute("tabindex");
    scroller.removeAttribute("role");
    scroller.removeAttribute("aria-label");
    owned = false;
  };
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(update);
  };

  const onWheel = (e: WheelEvent) => {
    // Trackpads and most browsers already send a sideways delta; only a
    // Shift + vertical wheel is turned, and only while there's room to go.
    if (!e.shiftKey || e.ctrlKey || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    const step = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? scroller.clientWidth : 1);
    const x = scroller.scrollLeft;
    if (max <= 1 || (step < 0 && x <= 0) || (step > 0 && x >= max - 1)) return;
    e.preventDefault();
    scroller.scrollLeft = x + step;
  };

  update();
  scroller.addEventListener("scroll", schedule, { passive: true });
  scroller.addEventListener("wheel", onWheel, { passive: false });
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  observer?.observe(scroller);
  if (scroller.firstElementChild) observer?.observe(scroller.firstElementChild);

  return () => {
    cancelAnimationFrame(raf);
    scroller.removeEventListener("scroll", schedule);
    scroller.removeEventListener("wheel", onWheel);
    observer?.disconnect();
    for (const name of ["data-scrollable", "data-scroll-start", "data-scroll-end"]) frame.removeAttribute(name);
    if (owned) release();
  };
}

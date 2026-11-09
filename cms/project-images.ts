import type { Element, Root } from "hast";
import { imageInfo } from "./media";

/** projects.css: 672px column, 20px mobile gutters, 48px above 600px. */
export function projectImageSizes(width = 672): string {
  const slot = Math.min(width, 672);
  return `(max-width: 600px) min(${slot}px, calc(100vw - 40px)), min(${slot}px, calc(100vw - 96px))`;
}

/** Route-only correction of the renderer's default Writing image slot. */
export function sizeProjectImages(tree: Root): void {
  function visit(node: Root | Element) {
    if (node.type === "element" && node.tagName === "img") {
      const info = imageInfo(String(node.properties.src ?? ""));
      // Author-resized images and inline icons already have their own sizing.
      if (info && node.properties.sizes === info.sizes && !node.properties.style) {
        node.properties.sizes = projectImageSizes(info.width);
      }
    }
    for (const child of node.children) if (child.type === "element") visit(child);
  }
  visit(tree);
}

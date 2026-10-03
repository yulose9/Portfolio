import { responsiveImage } from "../lib/images";
import type { Tool } from "../site-content";

/**
 * The tools I work with, as a row of small badges under the role line.
 *
 * Each logo is its own <img>, not inlined SVG. Several of the source files
 * reuse the same internal ids (mask and clipPath names, style classes), and
 * inlined into one document they would resolve to each other's definitions
 * and draw wrong. As separate files they are isolated, cached, and cost the
 * HTML nothing.
 *
 * Presentational only, so it stays a server component. The name shows on
 * hover through CSS (see .tool-row in globals.css) and is the alt text for
 * everyone else.
 */
export default function ToolRow({ tools }: { tools: Tool[] }) {
  return (
    <ul className="tool-row" aria-label="Tools I work with">
      {tools.map((tool) => {
        // A raster logo gets its 64/96px AVIF and WebP copies; SVGs pass through.
        const picked = responsiveImage(tool.src);
        return (
        <li key={tool.src} className="tool-badge" data-label={tool.label} data-keycap="">
          <a href={tool.href || undefined} target={tool.href ? "_blank" : undefined} rel={tool.href ? "noreferrer" : undefined}>
          <picture>
          {picked?.avifSrcSet ? <source type="image/avif" srcSet={picked.avifSrcSet} sizes="32px" /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={picked?.src ?? tool.src}
            srcSet={picked?.srcSet}
            sizes={picked?.srcSet ? "32px" : undefined}
            alt={tool.label}
            width={32}
            height={32}
            // Below the fold of attention, and tiny: never compete with the
            // portrait or the text for the first paint.
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          </picture>
          </a>
        </li>
        );
      })}
    </ul>
  );
}

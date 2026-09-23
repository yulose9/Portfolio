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
      {tools.map((tool) => (
        <li key={tool.src} className="tool-badge" data-label={tool.label}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tool.src}
            alt={tool.label}
            width={16}
            height={16}
            // Below the fold of attention, and tiny: never compete with the
            // portrait or the text for the first paint.
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        </li>
      ))}
    </ul>
  );
}

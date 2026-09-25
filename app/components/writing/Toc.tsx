import type { OutlineItem } from "../../lib/writing";

/**
 * "On this page": Notion's table-of-contents block, Obsidian's outline. In
 * the left margin, following you down the page, on a wide screen; a compact
 * block above the body on anything narrower. The section you're reading is
 * marked by the enhancement island (data-active), so the markup is complete
 * without script.
 */
export default function Toc({ items }: { items: OutlineItem[] }) {
  return (
    <div className="toc-rail">
      <nav className="toc" aria-label="On this page">
        <p className="toc-title">On this page</p>
        <ol>
          {items.map((item) => (
            <li key={item.id} data-depth={item.depth}>
              <a href={`#${item.id}`} data-toc-link={item.id}>
                {item.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

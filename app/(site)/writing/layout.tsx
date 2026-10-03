// The article body's block styles (tables, callouts, charts, polls, video,
// embeds, Fluent emoji). Only pages under /writing and /projects render an
// article body, so the home page doesn't load them.
import "../../article-blocks.css";
import "../../article-blocks-2.css";

export default function WritingLayout({ children }: { children: React.ReactNode }) {
  return children;
}

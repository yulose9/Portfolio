import { fluentUrl, splitEmoji } from "../../../cms/emoji";

/**
 * Text with its emoji drawn as Fluent 3D art. The characters stay in the DOM
 * (they're only made transparent), so selection, copy and search still see
 * the real emoji.
 */
export default function FluentText({ children }: { children: string }) {
  return (
    <>
      {splitEmoji(children).map((run, i) =>
        run.emoji ? (
          <span key={i} className="fe" style={{ "--fe": `url(${fluentUrl(run.text)})` } as React.CSSProperties}>
            {run.text}
          </span>
        ) : (
          run.text
        )
      )}
    </>
  );
}

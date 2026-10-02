import type { BlockKind } from "./commands";

/** Original, semantic previews; no upstream screenshots or editor instances. */
export default function BlockExample({ kind }: { kind: BlockKind }) {
  let example: React.ReactNode;
  switch (kind) {
    case "h1":
    case "h2":
    case "h3":
      example = (
        <>
          <strong className={`block-example-${kind}`}>A new perspective</strong>
          <p>A few words to introduce the idea.</p>
        </>
      );
      break;
    case "bullet":
      example = (
        <ul>
          <li>Collect an observation</li>
          <li>Follow the question</li>
        </ul>
      );
      break;
    case "ordered":
      example = (
        <ol>
          <li>Explore the idea</li>
          <li>Write a first draft</li>
        </ol>
      );
      break;
    case "todo":
      example = (
        <div>
          <p>☑ Gather sources</p>
          <p>☐ Review the draft</p>
        </div>
      );
      break;
    case "quote":
      example = <blockquote>Leave room for another point of view.</blockquote>;
      break;
    case "callout":
      example = (
        <div className="block-example-callout">
          ⓘ A detail worth remembering.
        </div>
      );
      break;
    case "toggle":
      example = (
        <div>
          <strong>▸ More context</strong>
          <p>Keep supporting details inside.</p>
        </div>
      );
      break;
    case "toggleH1":
    case "toggleH2":
    case "toggleH3":
      example = (
        <div>
          <strong className={`block-example-${kind.slice(-2).toLowerCase()}`}>▸ A section that folds</strong>
          <p>Everything under it tucks away.</p>
        </div>
      );
      break;
    case "code":
      example = (
        <pre>
          <code>{'const idea = "keep exploring";\nconsole.log(idea);'}</code>
        </pre>
      );
      break;
    default:
      example = <p>Start with a thought. Give it a little space to grow.</p>;
  }
  return (
    <div className="block-example" aria-hidden="true">
      {example}
    </div>
  );
}

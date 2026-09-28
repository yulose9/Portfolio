import type { Draft } from "./format";
export type Editorial = {
  stage: "idea" | "drafting" | "review" | "ready";
  reviewAt: string | null;
  timezone: "UTC";
};
export function cleanEditorial(value: unknown): Editorial {
  const v = value as Editorial;
  if (!v || !["idea", "drafting", "review", "ready"].includes(v.stage))
    throw new Error("Choose a valid editorial stage.");
  if (
    v.reviewAt !== null &&
    (typeof v.reviewAt !== "string" ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d{3})?)?Z$/.test(v.reviewAt) ||
      !Number.isFinite(Date.parse(v.reviewAt)))
  )
    throw new Error("Choose a valid UTC review date.");
  return {
    stage: v.stage,
    reviewAt: v.reviewAt ? new Date(v.reviewAt).toISOString() : null,
    timezone: "UTC",
  };
}
export function publicationChecks(draft: Pick<Draft, "body">) {
  const pending =
    /\[Pending media:|(?:src|href)=["']blob:|!\[[^\]]*\]\(blob:/i.test(
      draft.body,
    );
  const missingAlt = /<img\b[^>]*\balt=["']\s*["']|!\[\s*\]\(/i.test(
    draft.body,
  );
  return [
    {
      label: "Media uploads complete",
      ok: !pending,
      blocking: true,
      hint: "Finish or remove pending uploads before publishing.",
    },
    {
      label: "Article image descriptions",
      ok: !missingAlt,
      blocking: false,
      hint: "Describe meaningful images for readers using assistive technology.",
    },
  ];
}

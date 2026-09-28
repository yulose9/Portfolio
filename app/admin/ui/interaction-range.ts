import type { Transaction } from "@tiptap/pm/state";
/** Map the target, not the current selection: form focus may move the selection. */
export function mapInteractionRange(
  range: { from: number; to: number },
  transaction: Transaction,
) {
  const from = transaction.mapping.mapResult(range.from, 1);
  const to = transaction.mapping.mapResult(range.to, -1);
  if (
    (from.deletedAcross && to.deletedAcross) ||
    from.pos >= to.pos ||
    to.pos > transaction.doc.content.size
  )
    return null;
  return { from: from.pos, to: to.pos };
}

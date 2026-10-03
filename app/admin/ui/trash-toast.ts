import { toast } from "../../lib/toast";

/*
 * The one "moved to Trash" toast, for every place a post can be trashed
 * from (the editor, the post menu, the details sheet, the bulk bar).
 *
 * It says what went (the post's name, or how many) in a single short line,
 * with a quiet bin rather than a celebratory tick: deleting isn't a win.
 * Undo stays for eight seconds, and the toast doesn't vanish when it's
 * pressed: it turns into "Restoring…" and then "Restored" in place, or
 * says why it couldn't, so the undo is seen to work.
 */

const UNDO_WINDOW = 8000;

const short = (name: string, max = 32) => {
  const flat = name.replace(/\s+/g, " ").trim() || "Untitled";
  return `“${flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat}”`;
};

export function trashToast({
  name,
  count = 1,
  live = false,
  restore,
}: {
  /** The post's title, for one post. */
  name?: string;
  count?: number;
  /** Was it on the site? Then it's unpublished too. */
  live?: boolean;
  /** Puts it (or them) back. */
  restore: () => Promise<unknown>;
}) {
  const many = count > 1;
  const id = toast.add({
    type: "trash",
    title: live ? "Unpublished and moved to Trash" : "Moved to Trash",
    description: many ? `${count} posts` : short(name ?? ""),
    timeout: UNDO_WINDOW,
    // A ring beside Undo runs out with the window (components/ui/toast.tsx).
    data: { countdown: true },
    actionProps: {
      children: "Undo",
      onClick: () => {
        toast.update(id, { type: "loading", title: "Restoring…", description: undefined, timeout: 0, actionProps: undefined });
        restore().then(
          () => toast.update(id, { type: "success", title: "Restored", description: many ? `${count} posts` : short(name ?? ""), timeout: 2600 }),
          (error: unknown) =>
            toast.update(id, {
              type: "error",
              title: many ? "Couldn’t restore them" : "Couldn’t restore it",
              description: error instanceof Error ? error.message : "It’s still in Trash.",
              timeout: 0,
            }),
        );
      },
    },
  });
  return id;
}

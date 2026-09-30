export type Folders = {
  folders: { id: string; name: string }[];
  assignments: Record<string, string>;
};
export type FolderAction =
  | { type: "create"; id: string; name: string }
  | { type: "rename"; id: string; name: string }
  | { type: "remove"; id: string }
  | { type: "move"; pageId: string; folderId: string | null };
export function changeFolders(value: Folders, action: FolderAction): Folders {
  const next: Folders = {
    folders: value.folders.map((f) => ({ ...f })),
    assignments: { ...value.assignments },
  };
  if (action.type === "move") {
    if (!/^[a-z0-9]{6,32}$/.test(action.pageId))
      throw new Error("Invalid page.");
    if (action.folderId && !next.folders.some((f) => f.id === action.folderId))
      throw new Error("Folder no longer exists.");
    if (action.folderId) next.assignments[action.pageId] = action.folderId;
    else delete next.assignments[action.pageId];
  } else {
    if (typeof action.id !== "string" || !/^[a-z0-9-]{6,40}$/.test(action.id))
      throw new Error("Invalid folder.");
    const index = next.folders.findIndex((f) => f.id === action.id);
    if (action.type === "remove") {
      if (index < 0) throw new Error("Folder no longer exists.");
      next.folders.splice(index, 1);
      for (const [id, folder] of Object.entries(next.assignments))
        if (folder === action.id) delete next.assignments[id];
    } else if (action.type === "create" || action.type === "rename") {
      if (
        typeof action.name !== "string" ||
        !action.name.trim() ||
        action.name.trim().length > 80
      )
        throw new Error("Use a folder name between 1 and 80 characters.");
      if (
        next.folders.some(
          (f) =>
            f.id !== action.id &&
            f.name.toLowerCase() === action.name.trim().toLowerCase(),
        )
      )
        throw new Error("That folder name is already in use.");
      if (action.type === "create") {
        if (index >= 0 || next.folders.length >= 200)
          throw new Error(
            "Folder already exists or the 200-folder limit was reached.",
          );
        next.folders.push({ id: action.id, name: action.name.trim() });
      } else {
        if (index < 0) throw new Error("Folder no longer exists.");
        next.folders[index].name = action.name.trim();
      }
    } else throw new Error("Unknown folder action.");
  }
  return next;
}

export const CACHE_OWNER = "seneca_private_cache_owner";
const archiveKey = (owner: string) => `seneca_private_cache_v1:${encodeURIComponent(owner)}`;
const pendingKey = "seneca_private_cache_switch";
const privateKey = (key: string) => /^(wealth_|journal_|personal_goals_|study_|protocol_)/.test(key)
  || ["seneca_daily_logs", "seneca_global_data", "seneca_sync_dirty", "seneca_life_settings", "seneca_custom_certifications", "seneca_certification_statuses", "seneca_domains", "seneca_user_preferences"].includes(key);

/** Switch the working cache without importing another identity's unsynced data. */
export function switchPrivateCache(storage: Pick<Storage,"length"|"key"|"getItem"|"setItem"|"removeItem">, uid: string | null) {
  const next = uid ? `user:${uid}` : "local";
  const previous = storage.getItem(CACHE_OWNER);
  if (previous === next) return false;
  if (!previous && next === "local") { storage.setItem(CACHE_OWNER, next); return false; }
  const values: Record<string,string> = {};
  for (let i=0;i<storage.length;i++) {
    const key = storage.key(i);
    if (key && privateKey(key)) values[key] = storage.getItem(key)!;
  }
  // Preserve local-only/unsynced records, but never assign unknown legacy data to a signed-in user.
  const from = previous || "unassigned";
  // Retrying a quota-interrupted restore must not overwrite the intact archive
  // with the partially restored working set.
  if (storage.getItem(pendingKey) !== from) {
    storage.setItem(archiveKey(from), JSON.stringify(values));
    storage.setItem(pendingKey, from);
  }
  const raw = storage.getItem(archiveKey(next));
  let restored: Record<string,string> = {};
  try { const value = raw ? JSON.parse(raw) : {}; if (value && typeof value === "object" && !Array.isArray(value)) restored = value; } catch { /* Invalid backup stays isolated. */ }
  Object.keys(values).forEach(key => storage.removeItem(key));
  for (const [key,value] of Object.entries(restored)) if (privateKey(key) && typeof value === "string") storage.setItem(key,value);
  // Write ownership last. A failed swap must not label old data as the next user.
  storage.setItem(CACHE_OWNER, next);
  storage.removeItem(pendingKey);
  return true;
}

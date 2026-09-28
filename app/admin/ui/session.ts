/** Only an expiry verified by the API is used. Never read the auth cookie. */
export const SESSION_EVENT = "admin:session";
export let sessionExpiry = 0;
export let leavingForSignIn = false;
export function reportSession(value: number) {
  if (!Number.isFinite(value) || value <= 0 || value === sessionExpiry) return;
  sessionExpiry = value;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EVENT));
}
export function reportExpired() { if (!sessionExpiry || sessionExpiry > Date.now()) reportSession(Date.now() - 1); }
type Protection = { saved: boolean; recoverable: boolean; pending?: boolean };
let pendingWork = 0;
export function beginPendingWork() {
  pendingWork++;
  let ended = false;
  return () => { if (!ended) { ended = true; pendingWork--; } };
}
const protections=new Set<()=>Promise<Protection>>();
export function registerProtection(handler: () => Promise<Protection>) {
  protections.add(handler);
  return () => { protections.delete(handler); };
}
export async function protectWork(): Promise<Protection> {
  try {
    const results=await Promise.all([...protections].map(protect=>protect()));
    const result={saved:results.every(r=>r.saved),recoverable:results.every(r=>r.saved||r.recoverable),...(results.some(r=>r.pending)?{pending:true}:{})};
    return pendingWork ? {...result, pending:true} : result;
  } catch { return {saved:false, recoverable:false, pending:pendingWork > 0}; }
}
export function markLeaving() { leavingForSignIn = true; }

export type Recovery<T = Record<string, unknown>> = { id: string; base: string; edit: T; at: number; key?:string; token?:string };
const key = (id: string) => `admin:recovery:${id}`;
export function keepRecovery<T>(id: string, base: string, edit: T): boolean {
  try { sessionStorage.setItem(key(id), JSON.stringify({ id, base, edit, at: Date.now() })); return true; }
  catch { return false; }
}
export function readRecovery<T>(id: string): Recovery<T> | null {
  try {
    const item = JSON.parse(sessionStorage.getItem(key(id)) ?? "null");
    return item?.id === id && typeof item.base === "string" && item.edit && typeof item.edit.body === "string" ? item : null;
  } catch { return null; }
}
export function clearRecovery(id: string) { try { sessionStorage.removeItem(key(id)); } catch { /* storage unavailable */ } }

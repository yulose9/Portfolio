import { getSyncedField } from "./syncedField";
import { transactGlobalData, waitForAuth, privateSessionGeneration } from "./dataLogger";
import type { Ledger } from "../utils/wealthLedger";

export type PlanItem = { id: string; kind: "goal" | "recurring" | "event" | "category"; name: string; amount?: number; accountId?: string; destinationId?: string; date?: string; frequency?: string; category?: string; transactionType?: string; anchorDay?: number; endDate?:string; paused?: boolean; parentId?:string; deleted?: boolean };
export type WealthState = Ledger & { planningV1: Record<string, PlanItem>; categoryBudgetsV1: Record<string, import("../utils/wealthPlanning").CategoryBudget> };
const fields = { assets: "wealth_assets", liabilities: "wealth_liabilities", transactions: "wealth_transactions", planningV1: "wealth_planning_v1", categoryBudgetsV1: "wealth_category_budgets_v1" } as const;
let saving = false;
export async function mutateWealth(mutate: (state: WealthState) => WealthState) {
  if (saving) throw new Error("A money record is being saved. Please try again.");
  saving = true;
  try {
    const started = privateSessionGeneration();
    const user = await waitForAuth();
    if (started !== privateSessionGeneration()) throw new Error("Your account changed. Reopen this form before saving.");
    const generation = privateSessionGeneration();
    const controllers = Object.entries(fields).map(([field,storageKey]) => [field, getSyncedField("wealth",field,{initial:field === "planningV1" || field === "categoryBudgetsV1" ? {} : [], storageKey})] as const);
    const local = Object.fromEntries(controllers.map(([key,controller]) => [key,controller.get()])) as WealthState;
    const apply = (data: Partial<WealthState>) => mutate({assets:data.assets || [],liabilities:data.liabilities || [],transactions:data.transactions || [],planningV1:data.planningV1 || {},categoryBudgetsV1:data.categoryBudgetsV1 || {}});
    const result = user ? await transactGlobalData("wealth",apply) : apply(local);
    if (generation !== privateSessionGeneration()) throw new Error("Your account changed. Reload to see the saved result.");
    if (!user) {
      // One durable recovery record keeps the local fields together after a crash.
      localStorage.setItem("wealth_ledger_recovery", JSON.stringify(result));
    }
    if (!user) for (const [key,storageKey] of Object.entries(fields)) localStorage.setItem(storageKey, JSON.stringify(result[key]));
    for (const [key,controller] of controllers) controller.replaceCached(result[key]);
    if (!user) localStorage.removeItem("wealth_ledger_recovery");
    return result as WealthState;
  } finally { saving = false; }
}

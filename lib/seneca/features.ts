/** Temporary product switches. Data and implementations remain intact. */
export const SENECA_FEATURES = { wealth: false, priorityPayment: false };

export function availableSenecaTab<T extends string>(tab: T): T | "home" {
  return tab === "wealth" && !SENECA_FEATURES.wealth ? "home" : tab;
}

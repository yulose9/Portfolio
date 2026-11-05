export const CIVIL_SERVICE_EXAM = {
  id: "civil-service-professional",
  name: "Civil Service Professional Exam",
  level: "Professional", target: "", status: "locked", vendor: "Civil Service Commission",
};

type Domain = { id?: string; title?: string; modules?: { name?: string }[]; subcategories?: { modules?: { name?: string }[] }[]; [key: string]: unknown };
/** Preserve the owner's roadmap and the old certification's name-based identity. */
export function withCivilService<T extends Domain>(domains: T[]): (T | Domain)[] {
  const found = domains.some(domain => [...(domain.modules || []), ...(domain.subcategories || []).flatMap(sub => sub.modules || [])].some(module => /^Civil Service Professional(?: Exam)?$/i.test(module.name || "")));
  return found ? domains : [...domains, { id: "civil-service", title: "Public service", color: "#8B5CF6", icon: "🏛️", modules: [{ ...CIVIL_SERVICE_EXAM }] }];
}

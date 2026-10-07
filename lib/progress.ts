import type { EntryProgress, Progress, ModuleDefinition } from "../types/roadmap.ts";
export const statuses = ["NOT_STARTED", "LEARNING", "PRACTICING", "COMPLETED", "REVIEW"] as const;
export const aiLevels = ["NONE", "HINT", "REVIEW", "GENERATED"] as const;
export const emptyProgress = (): Progress => ({ modules: {}, items: {} });
export const defaultEntry = (): EntryProgress => ({ status: "NOT_STARTED", completedTasks: [], canExplainWithoutNotes: null, aiHelp: "NONE", notes: "", reflection: "", attempts: 0, updatedAt: "" });
export const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, c => c.toUpperCase());
function object(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function validEntry(value: unknown): boolean {
  if (!object(value)) return false;
  const allowed = ["status", "completedTasks", "canExplainWithoutNotes", "aiHelp", "notes", "reflection", "attempts", "updatedAt", "completedAt"];
  return Object.keys(value).every(key => allowed.includes(key)) && statuses.some(s => s === value.status)
    && aiLevels.some(a => a === value.aiHelp) && Array.isArray(value.completedTasks)
    && value.completedTasks.every(t => typeof t === "string") && new Set(value.completedTasks).size === value.completedTasks.length
    && (value.canExplainWithoutNotes === null || typeof value.canExplainWithoutNotes === "boolean")
    && typeof value.notes === "string" && typeof value.reflection === "string"
    && Number.isSafeInteger(value.attempts) && (value.attempts as number) >= 0
    && typeof value.updatedAt === "string" && (value.updatedAt === "" || Number.isFinite(Date.parse(value.updatedAt)))
    && (value.completedAt === undefined || (typeof value.completedAt === "string" && Number.isFinite(Date.parse(value.completedAt))));
}
export function parseExport(input: string): Progress {
  const value: unknown = JSON.parse(input);
  if (!object(value) || value.version !== 1 || typeof value.exportedAt !== "string" || !Number.isFinite(Date.parse(value.exportedAt)) || !object(value.progress)) throw new Error("This is not a version 1 progress export.");
  const p = value.progress;
  if (Object.keys(p).some(key => !["items", "modules"].includes(key)) || !object(p.items) || !object(p.modules)) throw new Error("Progress must contain items and modules.");
  for (const group of [p.items, p.modules]) {
    if (Object.entries(group).some(([id, entry]) => !/^[a-z0-9][a-z0-9-]*$/.test(id) || !validEntry(entry))) throw new Error("Invalid progress fields. Your existing progress has not been changed.");
  }
  return p as unknown as Progress;
}
export function exportProgress(progress: Progress): string { return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), progress }, null, 2); }
export function completion(module: ModuleDefinition, progress: Progress) {
  const completed = module.topics.filter(t => progress.items[t.id]?.status === "COMPLETED").length;
  return { completed, total: module.topics.length, percent: module.topics.length ? Math.round(completed / module.topics.length * 100) : 0 };
}
export function recommendations(modules: ModuleDefinition[], progress: Progress) {
  const all = modules.flatMap(m => m.topics.map(item => ({ item, module: m })));
  const ready = (dependencies: string[]) => dependencies.every(id => {
    const module = modules.find(m => m.id === id);
    return module ? completion(module, progress).percent === 100 : progress.items[id]?.status === "COMPLETED";
  });
  const unfinished = all.filter(t => !["COMPLETED", "REVIEW"].includes(progress.items[t.item.id]?.status ?? "NOT_STARTED"));
  const active = unfinished.find(t => ["LEARNING", "PRACTICING"].includes(progress.items[t.item.id]?.status ?? ""));
  const next = active ?? unfinished.find(t => ready([...t.module.dependencies, ...t.item.dependencies]));
  const review = all.find(t => progress.items[t.item.id]?.status === "REVIEW" || (progress.items[t.item.id]?.status === "COMPLETED" && progress.items[t.item.id]?.canExplainWithoutNotes === false));
  const current = next?.module ?? modules.find(m => completion(m, progress).percent < 100) ?? modules.at(-1);
  const challenge = current?.challenges.find(c => progress.items[c.id]?.status !== "COMPLETED");
  return { next, review, current, challenge };
}

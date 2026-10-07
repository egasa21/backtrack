import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { completion, defaultEntry, emptyProgress, exportProgress, parseExport, recommendations } from "../lib/progress.ts";
import type { ModuleDefinition } from "../types/roadmap.ts";
import { loadProgress, saveProgress, STORAGE_KEY } from "../lib/storage.ts";
const modules: ModuleDefinition[] = readdirSync("data/modules").filter(f => f.endsWith(".json")).map(file => JSON.parse(readFileSync(`data/modules/${file}`, "utf8"))).sort((a, b) => a.order - b.order);

test("progress exports round-trip notes, attempts, review and AI assistance without curriculum", () => {
  const progress = emptyProgress();
  progress.items[modules[0].topics[0].id] = { ...defaultEntry(), status: "REVIEW", aiHelp: "GENERATED", canExplainWithoutNotes: false, notes: "First line\nSecond line", reflection: "Check boundaries", attempts: 3, completedTasks: ["explain"] };
  progress.modules[modules[0].id] = { ...defaultEntry(), notes: "Module notes" };
  assert.deepEqual(parseExport(exportProgress(progress)), progress);
  assert.equal(exportProgress(progress).includes('"learningGoals"'), false);
});
test("localStorage reload restores progress and corrupt storage is never overwritten during load", () => {
  const values = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) } });
  try {
    assert.deepEqual(loadProgress(), emptyProgress());
    const progress = emptyProgress(); progress.items.example = { ...defaultEntry(), notes: "Persist across refresh\nwith multiple lines", attempts: 2 };
    saveProgress(progress); assert.deepEqual(loadProgress(), progress);
    values.set(STORAGE_KEY, "broken JSON"); assert.throws(loadProgress); assert.equal(values.get(STORAGE_KEY), "broken JSON");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => { throw new Error("Storage denied"); }, setItem: () => { throw new Error("Quota exceeded"); } } });
    assert.throws(loadProgress, /Storage denied/); assert.throws(() => saveProgress(progress), /Quota exceeded/);
  } finally { if (original) Object.defineProperty(globalThis, "localStorage", original); else Reflect.deleteProperty(globalThis, "localStorage"); }
});
test("malformed imports are rejected before they can replace progress", () => {
  assert.throws(() => parseExport("{}"));
  assert.throws(() => parseExport("not JSON"));
  for (const patch of [{ status: "UNKNOWN" }, { aiHelp: "OTHER" }, { notes: 12 }, { attempts: -1 }, { attempts: 1.5 }, { completedTasks: [false] }, { completedTasks: ["same", "same"] }, { canExplainWithoutNotes: "yes" }, { updatedAt: "invalid" }, { completedAt: "invalid" }, { extra: "field" }]) {
    const progress = emptyProgress(); progress.items.example = { ...defaultEntry(), ...patch } as never;
    assert.throws(() => parseExport(exportProgress(progress)));
  }
  const unsafe = '{"version":1,"exportedAt":"2026-10-07T00:00:00Z","progress":{"modules":{},"items":{"__proto__":{}}}}';
  assert.throws(() => parseExport(unsafe));
});
test("focus follows prerequisites, continues active practice, and separates review from completion", () => {
  const progress = emptyProgress();
  assert.equal(recommendations(modules, progress).next?.item.id, modules[0].topics[0].id);
  for (const topic of modules[0].topics) progress.items[topic.id] = { ...defaultEntry(), status: "COMPLETED" };
  assert.equal(completion(modules[0], progress).percent, 100);
  assert.equal(recommendations(modules, progress).next?.item.id, modules[1].topics[0].id);
  const first = modules[0].topics[0];
  progress.items[first.id].canExplainWithoutNotes = false;
  assert.equal(recommendations(modules, progress).review?.item.id, first.id);
  progress.items[first.id].status = "REVIEW";
  assert.equal(completion(modules[0], progress).completed, modules[0].topics.length - 1);
  const active = modules[1].topics[1]; progress.items[active.id] = { ...defaultEntry(), status: "PRACTICING" };
  assert.equal(recommendations(modules, progress).next?.item.id, active.id);
  for (const m of modules) for (const topic of m.topics) progress.items[topic.id] = { ...defaultEntry(), status: "COMPLETED" };
  assert.equal(recommendations(modules, progress).next, undefined);
});
test("every JSON module has unique routes, tasks and valid acyclic dependencies", () => {
  assert.ok(modules.length >= 8);
  const entries = modules.flatMap(m => [m, ...m.topics, ...m.exercises, ...m.challenges]);
  const ids = entries.map(e => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const m of modules) {
    assert.ok(m.topics.length && m.exercises.length && m.challenges.length);
    for (const item of [...m.topics, ...m.exercises, ...m.challenges]) {
      assert.ok(item.title && item.description && item.learningGoals.length && item.tasks.length);
      assert.equal(new Set(item.tasks.map(t => t.id)).size, item.tasks.length);
      assert.ok(item.tasks.every(t => t.title));
    }
  }
  const done = new Set<string>();
  function visit(id: string, stack = new Set<string>()) {
    assert.ok(ids.includes(id), `Unknown dependency: ${id}`);
    assert.ok(!stack.has(id), `Dependency cycle at ${id}`);
    if (done.has(id)) return;
    const next = new Set(stack).add(id);
    for (const dep of entries.find(e => e.id === id)!.dependencies) visit(dep, next);
    done.add(id);
  }
  ids.forEach(id => visit(id));
});

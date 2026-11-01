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

test("all lessons and practice have substantive material, verification criteria, and safe source links", () => {
  for (const module of modules) {
    assert.ok(module.outcomes?.length && module.completionCriteria?.length && module.studyGuidance?.length, module.id);
    for (const item of [...module.topics, ...module.exercises, ...module.challenges]) {
      const material = item.material;
      assert.ok(material, `Missing material: ${item.id}`);
      assert.ok(material.explanation.length >= 100, `Missing explanation: ${item.id}`);
      assert.ok(material.workedExample.scenario && material.workedExample.steps.length >= 2, item.id);
      assert.ok(material.commonMistakes.length && material.guidedExercise.length && material.independentExercise, item.id);
      assert.ok(material.recallQuestions.length >= 2 && item.acceptanceCriteria && item.acceptanceCriteria.length >= 2, item.id);
      assert.ok(item.resources?.length, `Missing references: ${item.id}`);
      for (const reference of item.resources) {
        const url = new URL(reference.url);
        assert.equal(url.protocol, "https:");
        assert.ok(reference.title && !url.username && !url.password);
      }
    }
  }
});

test("curriculum expansion preserves every original module, item, and task identity", () => {
  const original: Record<string, { items: Record<string, string[]> }> = JSON.parse(readFileSync("tests/curriculum-v1-ids.json", "utf8"));
  const progress = emptyProgress();
  for (const [moduleId, snapshot] of Object.entries(original)) {
    const module = modules.find(m => m.id === moduleId);
    assert.ok(module, `Removed module: ${moduleId}`);
    progress.modules[moduleId] = { ...defaultEntry(), notes: "Keep my module notes" };
    for (const [itemId, taskIds] of Object.entries(snapshot.items)) {
      const item = [...module.topics, ...module.exercises, ...module.challenges].find(i => i.id === itemId);
      assert.ok(item, `Removed item: ${itemId}`);
      for (const taskId of taskIds) assert.ok(item.tasks.some(t => t.id === taskId), `Removed task: ${itemId}/${taskId}`);
      progress.items[itemId] = { ...defaultEntry(), status: "COMPLETED", completedTasks: taskIds, notes: "Keep my notes", aiHelp: "HINT", canExplainWithoutNotes: true };
    }
  }
  assert.deepEqual(parseExport(exportProgress(progress)), progress);
});

test("concurrency module covers all twenty supplied concepts with linked labs and a capstone", () => {
  const module = modules.find(m => m.id === "concurrency-fundamentals");
  assert.ok(module);
  assert.equal(module.order, 12);
  assert.deepEqual(module.dependencies, ["java-core"]);
  assert.deepEqual(module.topics.map(t => t.title), [
    "Concurrency", "Concurrency vs Parallelism", "Processes vs Threads", "Thread Lifecycle",
    "Race Condition", "Mutex", "Semaphore", "Condition Variable", "Coarse vs Fine-grained Locking",
    "Reentrant Lock", "Deadlock", "Livelock", "Starvation", "Atomic Operations", "Thread Pool",
    "Producer-Consumer", "Blocking vs Non-blocking", "Backpressure", "Immutability", "Idempotency under concurrency",
  ]);
  assert.equal(module.exercises.length, 4);
  assert.equal(module.challenges.length, 1);
  for (const lab of module.exercises) {
    assert.ok(lab.dependencies.length);
    assert.ok(lab.requirements?.length && lab.constraints?.length && lab.deliverables?.length);
    assert.ok(module.challenges[0].dependencies.includes(lab.id));
  }
  const capstone = module.challenges[0];
  assert.ok(capstone.dependencies.includes(module.topics[19].id));
  assert.ok(capstone.acceptanceCriteria!.length >= 7);
  const progress = emptyProgress();
  for (const m of modules) for (const topic of m.topics) {
    if (m.id !== module.id) progress.items[topic.id] = { ...defaultEntry(), status: "COMPLETED" };
  }
  assert.equal(recommendations(modules, progress).next?.item.id, module.topics[0].id);
});

test("concurrency levels cover intermediate and advanced skills with an ordered learning path", () => {
  const expected = [
    { id: "concurrency-intermediate", prerequisite: "concurrency-fundamentals", order: 13, topics: [
      "happens-before", "safe-publication", "concurrent-collections", "future-composition", "cancellation-deadlines",
      "coordination-primitives", "read-mostly-state", "scheduling-overlap", "virtual-threads", "single-flight",
    ] },
    { id: "concurrency-advanced", prerequisite: "concurrency-intermediate", order: 14, topics: [
      "linearizability", "memory-ordering", "cas-and-aba", "progress-guarantees", "contention-locality",
      "work-stealing", "reactive-demand", "structured-concurrency", "correctness-and-benchmarks", "diagnosis-and-boundaries",
    ] },
  ];
  for (const level of expected) {
    const module = modules.find(m => m.id === level.id);
    assert.ok(module);
    assert.equal(module.order, level.order);
    assert.deepEqual(module.dependencies, [level.prerequisite]);
    assert.deepEqual(module.topics.map(t => t.id), level.topics.map(id => `${level.id}-${id}`));
    for (const [index, topic] of module.topics.entries()) {
      assert.deepEqual(topic.dependencies, index ? [module.topics[index - 1].id] : []);
    }
    assert.equal(module.exercises.length, 3);
    assert.equal(module.challenges.length, 1);
    for (const practice of [...module.exercises, ...module.challenges]) {
      assert.ok(practice.requirements?.length && practice.constraints?.length && practice.deliverables?.length);
    }
    for (const lab of module.exercises) assert.ok(module.challenges[0].dependencies.includes(lab.id));
    assert.ok(module.challenges[0].acceptanceCriteria!.length >= 7);
  }
  const progress = emptyProgress();
  const levels = ["concurrency-fundamentals", ...expected.map(level => level.id)];
  for (const module of modules) {
    if (!levels.includes(module.id)) for (const topic of module.topics) {
      progress.items[topic.id] = { ...defaultEntry(), status: "COMPLETED" };
    }
  }
  for (const id of levels) {
    const module = modules.find(m => m.id === id)!;
    for (const topic of module.topics) {
      assert.equal(recommendations(modules, progress).next?.item.id, topic.id);
      progress.items[topic.id] = { ...defaultEntry(), status: "COMPLETED" };
    }
  }
  assert.equal(recommendations(modules, progress).next, undefined);
});

test("networking guide retains every unit, capstone acceptance check, and self-assessment question", () => {
  const module = modules.find(m => m.id === "backend-networking");
  assert.ok(module?.sourceGuide);
  assert.equal(module.order, 9);
  assert.deepEqual(module.dependencies, ["production-thinking"]);
  const guide = readFileSync(`public${module.sourceGuide.url}`, "utf8");
  const units = [...guide.matchAll(/^# Unit (\d+) — /gm)].map(match => Number(match[1]));
  assert.deepEqual(units, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  for (const unit of units.slice(0, -1)) assert.ok(module.topics.some(t => t.id === `networking-unit-${unit}`));
  const clean = (text: string) => text.replaceAll("**", "").replaceAll("`", "");
  const acceptanceSection = guide.split("## Acceptance tests")[1].split("## Oral design review")[0];
  const checks = [...acceptanceSection.matchAll(/^- \[ \] (.+)$/gm)].map(match => clean(match[1]));
  assert.equal(checks.length, 10);
  const capstone = module.challenges.find(c => c.id === "networking-mini-payment-status-reconciler");
  assert.ok(capstone);
  for (const check of checks) assert.ok(capstone.acceptanceCriteria?.includes(check), `Missing capstone check: ${check}`);
  assert.equal(capstone.material?.recallQuestions.length, 6);
  const assessment = module.exercises.find(e => e.id === "networking-networking-written-self-assessment");
  assert.equal(assessment?.material?.recallQuestions.length, 20);
  assert.ok(capstone.acceptanceCriteria?.some(c => c.includes("Expired lease holders")));
});

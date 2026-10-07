import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import definition from "@/data/roadmap.json";
import type { ModuleDefinition, RoadmapDefinition } from "@/types/roadmap";
export const roadmap: RoadmapDefinition = definition;
const directory = path.join(process.cwd(), "data/modules");
export const modules: ModuleDefinition[] = readdirSync(directory).filter(file => file.endsWith(".json")).map(file => JSON.parse(readFileSync(path.join(directory, file), "utf8"))).sort((a, b) => a.order - b.order);
const ids = new Set<string>();
for (const module of modules) {
  for (const entry of [module, ...module.topics, ...module.exercises, ...module.challenges]) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(entry.id) || ids.has(entry.id)) throw new Error(`Invalid or duplicate curriculum ID: ${entry.id}`);
    ids.add(entry.id);
  }
}
for (const module of modules) {
  for (const entry of [module, ...module.topics, ...module.exercises, ...module.challenges]) {
    for (const dependency of entry.dependencies) if (!ids.has(dependency)) throw new Error(`Unknown dependency ${dependency} in ${entry.id}`);
  }
}

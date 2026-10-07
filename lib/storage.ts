import { emptyProgress, exportProgress, parseExport } from "./progress.ts";
import type { Progress } from "../types/roadmap.ts";
export const STORAGE_KEY = "backtrack-progress-v1";
export function loadProgress(): Progress {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === null ? emptyProgress() : parseExport(raw);
}
export function saveProgress(progress: Progress) { localStorage.setItem(STORAGE_KEY, exportProgress(progress)); }

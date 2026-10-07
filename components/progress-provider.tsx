"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { EntryProgress, Progress, ModuleDefinition, RoadmapDefinition } from "@/types/roadmap";
import { defaultEntry, emptyProgress, parseExport } from "@/lib/progress";
import { loadProgress, saveProgress, STORAGE_KEY } from "@/lib/storage";
interface Store {
  modules: ModuleDefinition[]; roadmap: RoadmapDefinition; progress: Progress; ready: boolean; error: string;
  update: (group: "modules" | "items", id: string, patch: Partial<EntryProgress>) => void;
  replace: (progress: Progress) => boolean;
}
const Context = createContext<Store | null>(null);
export function ProgressProvider({ modules, roadmap, children }: { modules: ModuleDefinition[]; roadmap: RoadmapDefinition; children: React.ReactNode }) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const latest = useRef(progress);
  const blocked = useRef(false);
  useEffect(() => {
    try { latest.current = loadProgress(); setProgress(latest.current); }
    catch { blocked.current = true; setError("Stored progress could not be read. Autosave is paused to protect it. Import a backup or reset from Settings."); }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      try { const value = event.newValue === null ? emptyProgress() : parseExport(event.newValue); latest.current = value; setProgress(value); blocked.current = false; setError(""); }
      catch { blocked.current = true; setError("Another tab saved unreadable progress. Autosave is paused. Import a backup in Settings."); }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  function replace(value: Progress) {
    try { saveProgress(value); latest.current = value; setProgress(value); blocked.current = false; setError(""); return true; }
    catch { setError("Progress could not be saved. Check browser storage permissions or space, then try again. Export a backup before closing this page."); return false; }
  }
  function update(group: "modules" | "items", id: string, patch: Partial<EntryProgress>) {
    if (!ready) return;
    const old = latest.current[group][id] ?? defaultEntry();
    const entry = { ...old, ...patch, updatedAt: new Date().toISOString() };
    if (patch.status) {
      if (patch.status === "COMPLETED") entry.completedAt = old.completedAt ?? entry.updatedAt;
      else delete entry.completedAt;
    }
    const next = { ...latest.current, [group]: { ...latest.current[group], [id]: entry } };
    latest.current = next; setProgress(next);
    if (!blocked.current) replace(next);
  }
  return <Context.Provider value={{ modules, roadmap, progress, ready, error, update, replace }}>{children}</Context.Provider>;
}
export function useProgress() { const value = useContext(Context); if (!value) throw new Error("Missing progress provider"); return value; }

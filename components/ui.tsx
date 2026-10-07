"use client";
import Link from "next/link";
import { useProgress } from "./progress-provider";
import { completion, label } from "@/lib/progress";
import type { LearningStatus, ModuleDefinition } from "@/types/roadmap";
export function Status({ status = "NOT_STARTED" }: { status?: LearningStatus }) { return <span className={`status status-${status.toLowerCase()}`}><i />{label(status)}</span>; }
export function ProgressBar({ percent }: { percent: number }) { return <div className="progress-track" role="progressbar" aria-label="Topics completed" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${percent}%` }} /></div>; }
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) { return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>; }
export function Dependencies({ ids }: { ids: string[] }) {
  const { modules, progress } = useProgress();
  return <div className="dependencies">{ids.length === 0 ? <span className="text-sm text-slate-500">No prerequisites. Start here.</span> : ids.map(id => {
    const module = modules.find(m => m.id === id);
    const item = modules.flatMap(m => [...m.topics.map(i => ({ ...i, section: "topics" })), ...m.exercises.map(i => ({ ...i, section: "exercises" })), ...m.challenges.map(i => ({ ...i, section: "challenges" }))]).find(i => i.id === id);
    const complete = module ? completion(module, progress).percent === 100 : progress.items[id]?.status === "COMPLETED";
    return <Link key={id} href={`/${module ? "modules" : item?.section ?? "topics"}/${id}/`} className={complete ? "dependency met" : "dependency"}>{complete ? "✓" : "○"} {module?.title ?? item?.title ?? id}<small>{complete ? "Ready" : "Incomplete"}</small></Link>;
  })}</div>;
}
export function ModuleCard({ module, connected = false }: { module: ModuleDefinition; connected?: boolean }) {
  const { progress } = useProgress();
  const stats = completion(module, progress);
  const explicit = progress.modules[module.id]?.status;
  const status = explicit ?? (stats.percent === 100 ? "COMPLETED" : module.topics.some(t => progress.items[t.id]?.status === "REVIEW") ? "REVIEW" : module.topics.some(t => progress.items[t.id]?.status === "PRACTICING") ? "PRACTICING" : module.topics.some(t => progress.items[t.id]?.status === "LEARNING") || stats.completed ? "LEARNING" : "NOT_STARTED");
  return <div className={connected ? "roadmap-node" : ""}><Link href={`/modules/${module.id}/`} className="module-card"><div className="module-card-top"><span className="module-number">{String(module.order).padStart(2, "0")}</span><Status status={status} /></div><h3>{module.title}</h3><p>{module.goal}</p><div className="module-card-progress"><span>{stats.completed} / {stats.total} topics</span><strong>{stats.percent}%</strong></div><ProgressBar percent={stats.percent} /><div className="module-card-bottom"><span>◇ {module.challenges.length} challenge{module.challenges.length === 1 ? "" : "s"}</span><span>Explore module ↗</span></div></Link>{connected && <div className="roadmap-prerequisites"><Dependencies ids={module.dependencies} /></div>}</div>;
}

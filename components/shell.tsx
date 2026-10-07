"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProgress } from "./progress-provider";
import { completion } from "@/lib/progress";
const nav = [["/", "◫", "Overview"], ["/roadmap/", "⌘", "Roadmap"], ["/challenges/", "◇", "Challenges"], ["/review/", "↺", "Review"], ["/settings/", "⚙", "Progress & backup"]];
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { modules, progress, ready, error } = useProgress();
  const total = modules.reduce((n, m) => n + m.topics.length, 0);
  const done = modules.reduce((n, m) => n + completion(m, progress).completed, 0);
  return <div className="workspace"><aside className="sidebar"><Link href="/" className="brand"><span className="brand-mark">b<span>_</span></span><span>backtrack<span className="brand-caption">ENGINEERING JOURNEY</span></span></Link><div className="nav-label">WORKSPACE</div><nav aria-label="Main navigation">{nav.map(([url, icon, name]) => <Link key={url} href={url} className={pathname === url || (url !== "/" && pathname.startsWith(url)) ? "nav-link active" : "nav-link"}><span aria-hidden="true">{icon}</span>{name}</Link>)}</nav><div className="sidebar-modules"><div className="nav-label">YOUR CURRICULUM <span>{String(modules.length).padStart(2, "0")}</span></div>{modules.map(m => <Link key={m.id} href={`/modules/${m.id}/`} className={pathname.includes(m.id) ? "module-link selected" : "module-link"}><span className={completion(m, progress).percent === 100 ? "module-dot done" : "module-dot"}>{completion(m, progress).percent === 100 ? "✓" : String(m.order).padStart(2, "0")}</span>{m.title}</Link>)}</div><div className="sidebar-bottom"><div className="flex justify-between text-xs"><span>Your progress</span><strong>{done}/{total}</strong></div><div className="progress-track"><span style={{ width: `${total ? done / total * 100 : 0}%` }} /></div><span className="local-label"><i /> Stored on this device</span></div></aside><div className="main-column"><header className="topbar"><span>Personal workspace <span className="crumb">/ Backend engineering</span></span><span className="local-pill"><i /> Local-first</span></header>{error && <div className="storage-error" role="alert">{error} <Link href="/settings/">Open settings →</Link></div>}<main>{ready ? children : <div className="loading" role="status">Loading your journey…</div>}</main><footer>Built through practice, one concept at a time.<span>YOUR PACE. YOUR PROGRESS.</span></footer></div></div>;
}

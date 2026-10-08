import { notFound } from "next/navigation";
import { catalog, modules } from "@/lib/roadmap";
import { ModuleDetail, ItemDetail } from "@/components/details";
export function generateStaticParams() { return modules.flatMap(m => [{ section: "modules", id: m.id }, ...(["topics", "exercises", "challenges"] as const).flatMap(section => m[section].map(item => ({ section, id: item.id })))]); }
export default async function Page({ params }: { params: Promise<{ section: string; id: string }> }) {
  const { section, id } = await params;
  const module = modules.find(m => m.id === id);
  if (section === "modules" && module) return <ModuleDetail module={catalog.find(m => m.id === id)!} />;
  if (section === "topics" || section === "exercises" || section === "challenges") {
    const parent = modules.find(m => m[section].some(item => item.id === id));
    const item = parent?.[section].find(item => item.id === id);
    if (parent && item) return <ItemDetail module={parent} item={item} section={section} />;
  }
  notFound();
}

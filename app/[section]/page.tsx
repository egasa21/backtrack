import { notFound } from "next/navigation";
import { RoadmapView, ItemList } from "@/components/views";
import { Settings } from "@/components/settings";
export function generateStaticParams() { return ["roadmap", "challenges", "review", "settings"].map(section => ({ section })); }
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (section === "roadmap") return <RoadmapView />;
  if (section === "challenges") return <ItemList />;
  if (section === "review") return <ItemList review />;
  if (section === "settings") return <Settings />;
  notFound();
}

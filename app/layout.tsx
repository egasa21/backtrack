import type { Metadata } from "next";
import "./globals.css";
import { catalog, roadmap } from "@/lib/roadmap";
import { ProgressProvider } from "@/components/progress-provider";
import { Shell } from "@/components/shell";
export const metadata: Metadata = { title: "Backtrack — Engineering Journey", description: "A local-first roadmap for practical backend engineering." };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><ProgressProvider modules={catalog} roadmap={roadmap}><Shell>{children}</Shell></ProgressProvider></body></html>;
}

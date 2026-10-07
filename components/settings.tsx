"use client";
import { useRef, useState } from "react";
import { useProgress } from "./progress-provider";
import { emptyProgress, exportProgress, parseExport } from "@/lib/progress";
import type { Progress } from "@/types/roadmap";
import { PageHeading } from "./ui";
export function Settings() {
  const { progress, replace, error } = useProgress();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Progress | "reset" | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  function exportFile() {
    const url = URL.createObjectURL(new Blob([exportProgress(progress)], { type: "application/json" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "my-learning-progress.json"; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("Progress exported. Keep this file as your backup.");
  }
  function confirm(value: Progress | "reset") { setPending(value); dialog.current?.showModal(); cancelButton.current?.focus(); }
  async function importFile(file?: File) {
    setMessage("");
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Choose a progress file smaller than 10 MB.");
      confirm(parseExport(await file.text()));
    } catch (failure) { setMessage(failure instanceof SyntaxError ? "Invalid JSON. Your existing progress has not been changed." : failure instanceof Error ? failure.message : "Could not read this file."); }
    if (fileInput.current) fileInput.current.value = "";
  }
  function apply() {
    if (!pending) return;
    if (replace(pending === "reset" ? emptyProgress() : pending)) { setMessage(pending === "reset" ? "Progress reset. Your curriculum is ready for a fresh start." : "Progress imported and saved on this device."); dialog.current?.close(); setPending(null); }
  }
  return <><PageHeading eyebrow="YOUR DATA, YOUR DEVICE" title="Progress & backup" description="Keep a copy of your learning journey. Bring it with you when you change browsers." /><div className="settings-grid"><section className="panel"><span className="settings-icon">↗</span><h2>Export progress</h2><p>Download all statuses, notes, task checklists, AI assistance, reflections, and attempts as a JSON file.</p><button className="button button-primary" onClick={exportFile}>Export progress ↓</button></section><section className="panel"><span className="settings-icon">↙</span><h2>Import progress</h2><p>Restore a version 1 export. The file is validated before you confirm replacing your current progress.</p><input ref={fileInput} className="sr-only" type="file" accept=".json,application/json" aria-label="Import progress JSON file" onChange={e => void importFile(e.target.files?.[0])} /><button className="button button-white" onClick={() => fileInput.current?.click()}>Choose JSON file ↑</button></section></div><div role="status" aria-live="polite" className={message ? "notice" : ""}>{message}</div><section className="panel section-spacing"><h2>Start again</h2><p>Reset all personal progress on this browser. Export a backup first if you want to keep your notes.</p><button className="button button-danger" onClick={() => confirm("reset")}>Reset progress</button></section><section className="panel section-spacing"><h2>How your progress is stored</h2><p>Your learning progress stays in this browser’s local storage. It is not synced between devices. Clearing site data removes it; private browsing may discard it when you close the browser.</p><p>Export regularly, especially before switching browsers or deployments. Curriculum definitions are separate from your personal progress.</p></section><dialog ref={dialog} className="confirmation" aria-labelledby="confirm-title" onCancel={() => setPending(null)}><h2 id="confirm-title">{pending === "reset" ? "Reset all progress?" : "Replace current progress?"}</h2><p>{pending === "reset" ? "This removes all statuses, notes, checklists, reflections, and attempts from this browser." : "Importing replaces all progress in this browser with the selected file."} Export a backup first if you want to keep your current work.</p>{error && <p role="alert">{error}</p>}<div className="dialog-actions"><button ref={cancelButton} className="button button-white" onClick={() => { dialog.current?.close(); setPending(null); }}>Cancel</button><button className="button button-danger" onClick={apply}>{pending === "reset" ? "Reset all progress" : "Replace progress"}</button></div></dialog></>;
}

/** Local persistence for a coder's session.
 *
 * Labels are written to localStorage on every keystroke-speed action, because losing an
 * afternoon of coding to a refresh is the fastest way to lose a coder. localStorage is
 * per-browser and never leaves the machine, so the authoritative copy is whatever the coder
 * exports at the end (or submits, if a collection endpoint is configured).
 */
import type { Label, Session, Verdict } from "./types";
import { KEY } from "./types";

const LS = (coder: string) => `jev-gold:${coder}`;

export function load(coder: string): Session {
  if (typeof window === "undefined") return blank(coder);
  try {
    const raw = window.localStorage.getItem(LS(coder));
    if (raw) {
      const s = JSON.parse(raw) as Session;
      // tolerate sessions written by an older version
      return { ...blank(coder), ...s, labels: s.labels ?? {}, notes: s.notes ?? {} };
    }
  } catch {
    /* corrupted or blocked storage: fall through to a blank session */
  }
  return blank(coder);
}

export function blank(coder: string): Session {
  return { coder, started: Date.now(), labels: {}, notes: {}, cursor: 0 };
}

export function save(s: Session): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS(s.coder), JSON.stringify(s));
  } catch {
    /* quota or private mode: the export button is still the real deliverable */
  }
}

export function setLabel(
  s: Session, taskId: number, variable: string, verdict: Verdict, ms: number
): Session {
  const labels = { ...s.labels };
  labels[KEY(taskId, variable)] = { taskId, variable, verdict, ms, ts: Date.now() };
  return { ...s, labels };
}

export function counts(s: Session, tasks: { id: number; vars: string[] }[]) {
  let done = 0, total = 0, tasksDone = 0;
  for (const t of tasks) {
    let d = 0;
    for (const v of t.vars) {
      total++;
      if (s.labels[KEY(t.id, v)]) { done++; d++; }
    }
    if (d === t.vars.length && t.vars.length > 0) tasksDone++;
  }
  return { done, total, tasksDone };
}

/** The file a coder sends back. Self-describing so it can be ingested without context. */
export function exportPayload(s: Session, datasetGenerated: string) {
  return {
    format: "jev-gold-labels/v1",
    coder: s.coder,
    dataset_generated: datasetGenerated,
    exported: new Date().toISOString(),
    n_labels: Object.keys(s.labels).length,
    labels: Object.values(s.labels),
    notes: s.notes,
  };
}

export function download(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

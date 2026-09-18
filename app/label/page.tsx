"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Dataset, Session, Verdict } from "@/lib/types";
import type { Roster } from "@/lib/allocate";
import { assignmentFor } from "@/lib/allocate";
import { KEY, VERDICTS } from "@/lib/types";
import { counts, download, exportPayload, load, save, setLabel } from "@/lib/store";

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Labeller />
    </Suspense>
  );
}

function Loading() {
  return <main className="wrap" style={{ padding: 48 }}><p className="muted">Loading…</p></main>;
}

function Labeller() {
  const params = useSearchParams();
  const rater = params.get("rater") ?? params.get("coder") ?? "";
  const [data, setData] = useState<Dataset | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [s, setS] = useState<Session | null>(null);
  const [saved, setSaved] = useState(true);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const enter = useRef<number>(Date.now());

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j) => { setData(j.dataset); setRoster(j.roster); })
      .catch(() => { window.location.href = "/gate"; });
  }, []);
  useEffect(() => { if (rater) setS(load(rater)); }, [rater]);

  /** The slice this rater owns: the shared calibration items, then their own assignment.
   *  Everything is derived from the roster position, so no server coordination is needed
   *  and a reload or a different machine yields the same set. */
  const myTasks = useMemo(() => {
    if (!data || !roster) return null;
    const i = roster.raters.findIndex((r) => r.id === rater);
    if (i < 0) return null;
    const { calibration, assigned } = assignmentFor(i, data.tasks.length, roster);
    return [...calibration, ...assigned].map((j) => ({ ...data.tasks[j], calibration: j < roster.calibration_n }));
  }, [data, roster, rater]);

  const task = useMemo(() => (myTasks && s ? myTasks[s.cursor] : null), [myTasks, s]);
  useEffect(() => { enter.current = Date.now(); }, [task?.id]);

  const persist = useCallback((next: Session) => {
    setS(next); save(next); setSaved(true);
  }, []);

  const answer = useCallback((variable: string, v: Verdict) => {
    if (!s || !task) return;
    setSaved(false);
    persist(setLabel(s, task.id, variable, v, Date.now() - enter.current));
  }, [s, task, persist]);

  const move = useCallback((d: number) => {
    if (!s || !myTasks) return;
    const n = Math.min(Math.max(s.cursor + d, 0), myTasks.length - 1);
    persist({ ...s, cursor: n });
  }, [s, myTasks, persist]);

  /** The first unanswered question on this narrative, so keyboard answers land in order. */
  const nextUnanswered = useMemo(() => {
    if (!s || !task) return null;
    return task.vars.find((v) => !s.labels[KEY(task.id, v)]) ?? null;
  }, [s, task]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") { move(1); return; }
      if (e.key === "ArrowLeft") { move(-1); return; }
      const hit = VERDICTS.find((x) => x.key === e.key);
      if (hit && nextUnanswered) { e.preventDefault(); answer(nextUnanswered, hit.v); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, answer, nextUnanswered]);

  if (!rater) return <main className="wrap" style={{ padding: 48 }}>
    <p>No rater selected. <a href="/">Start here</a>.</p></main>;
  if (data && roster && myTasks === null) return <main className="wrap" style={{ padding: 48 }}>
    <p>&ldquo;{rater}&rdquo; is not on the roster. <a href="/">Pick your name</a>.</p></main>;
  if (!data || !s || !task || !myTasks) return <Loading />;

  const c = counts(s, myTasks);
  const pct = c.total ? Math.round((100 * c.done) / c.total) : 0;
  const isCal = (task as { calibration?: boolean }).calibration === true;
  const allDone = task.vars.every((v) => s.labels[KEY(task.id, v)]);

  return (
    <main style={{ paddingBottom: 56 }}>
      <header style={{
        position: "sticky", top: 0, zIndex: 10, background: "var(--panel)",
        borderBottom: "1px solid var(--line)",
      }}>
        <div className="wrap" style={{
          display: "flex", gap: 16, alignItems: "center", padding: "10px 20px", flexWrap: "wrap",
        }}>
          <strong style={{ fontSize: 14 }}>Narrative {s.cursor + 1} / {myTasks.length}</strong>
          <div style={{
            flex: "1 1 180px", minWidth: 120, height: 6, borderRadius: 3,
            background: "var(--line)", overflow: "hidden",
          }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--blue)" }} />
          </div>
          <span className="muted" style={{ fontSize: 13 }}>
            {c.done} / {c.total} answers · {c.tasksDone} narratives complete
          </span>
          <span className="muted" style={{ fontSize: 12 }}>
            {saved ? "saved" : "saving…"} · {rater}
          </span>
          <button
            onClick={() => download(`gold-labels-${rater}.json`, exportPayload(s, data.generated))}
            style={{ fontSize: 13 }}
          >
            Download my labels
          </button>
        </div>
      </header>

      <div className="wrap" style={{
        display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
        gap: 20, alignItems: "start", paddingTop: 20,
      }}>
        {/* ---------------------------------------------------------------- narrative */}
        <section className="panel" style={{ padding: 20, position: "sticky", top: 74 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span className="muted" style={{ fontSize: 12, letterSpacing: ".06em" }}>
              NARRATIVE {isCal && <span style={{ color: "var(--orange)" }}>· calibration item</span>}
            </span>
            <button
              onClick={() => setFlagged((f) => new Set(f).add(task.id))}
              style={{
                fontSize: 12, padding: "3px 9px",
                color: flagged.has(task.id) ? "var(--red)" : undefined,
                borderColor: flagged.has(task.id) ? "var(--red)" : undefined,
              }}
              title="Flag if this text still contains identifying detail"
            >
              {flagged.has(task.id) ? "Flagged" : "Flag PII"}
            </button>
          </div>
          <p className="mono" style={{
            whiteSpace: "pre-wrap", margin: 0, fontSize: 13.5, lineHeight: 1.7,
          }}>
            {task.text}
          </p>
          <textarea
            placeholder="Optional note about this narrative"
            value={s.notes[task.id] ?? ""}
            onChange={(e) => persist({ ...s, notes: { ...s.notes, [task.id]: e.target.value } })}
            rows={2}
            style={{ marginTop: 14, fontSize: 13 }}
          />
        </section>

        {/* ---------------------------------------------------------------- questions */}
        <section style={{ display: "grid", gap: 12 }}>
          {task.vars.map((v) => {
            const crit = data.criteria[v];
            const cur = s.labels[KEY(task.id, v)]?.verdict;
            const isNext = v === nextUnanswered;
            return (
              <div key={v} className="panel" style={{
                padding: 16,
                borderColor: isNext && !cur ? "var(--blue)" : undefined,
              }}>
                <p style={{ margin: "0 0 10px", fontWeight: 600, fontSize: 14.5 }}>
                  {crit?.instructions ?? v}
                </p>
                {crit && (
                  <div style={{ fontSize: 12.5, marginBottom: 12 }}>
                    <p style={{ margin: "0 0 4px" }}>
                      <span style={{ color: "var(--green)", fontWeight: 600 }}>Yes if: </span>
                      <span className="muted">{crit.true}</span>
                    </p>
                    <p style={{ margin: 0 }}>
                      <span style={{ color: "var(--red)", fontWeight: 600 }}>No if: </span>
                      <span className="muted">{crit.false}</span>
                    </p>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  {VERDICTS.map((x) => (
                    <button
                      key={x.v}
                      onClick={() => answer(v, x.v)}
                      title={x.hint}
                      style={{
                        flex: 1,
                        fontWeight: cur === x.v ? 600 : 400,
                        background: cur === x.v ? "var(--blue)" : undefined,
                        color: cur === x.v ? "#fff" : undefined,
                        borderColor: cur === x.v ? "var(--blue)" : undefined,
                      }}
                    >
                      {x.label}
                      {isNext && !cur && (
                        <kbd style={{ marginLeft: 7 }}>{x.key}</kbd>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
            <button onClick={() => move(-1)} disabled={s.cursor === 0}>← Previous</button>
            <button
              onClick={() => move(1)}
              disabled={s.cursor >= myTasks.length - 1}
              style={{
                fontWeight: 600,
                background: allDone ? "var(--blue)" : undefined,
                color: allDone ? "#fff" : undefined,
                borderColor: allDone ? "var(--blue)" : undefined,
              }}
            >
              Next narrative →
            </button>
            <span className="muted" style={{ fontSize: 12.5 }}>
              <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> to answer · <kbd>←</kbd> <kbd>→</kbd> to move
            </span>
          </div>

          {c.done === c.total && (
            <div className="panel" style={{
              padding: 16, borderColor: "var(--green)", marginTop: 4,
            }}>
              <strong>All {c.total} answers recorded.</strong>
              <p className="muted" style={{ margin: "6px 0 10px", fontSize: 13.5 }}>
                Download the file and send it back. Keep this browser profile until we
                confirm receipt.
              </p>
              <button
                onClick={() =>
                  download(`gold-labels-${rater}.json`, exportPayload(s, data.generated))}
                style={{
                  background: "var(--green)", color: "#fff", borderColor: "var(--green)",
                  fontWeight: 600,
                }}
              >
                Download my labels
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Roster } from "@/lib/allocate";

/** Entry page: pick yourself from the roster, then read the protocol.
 *
 *  Raters choose from a fixed roster rather than typing a free-text ID, because the work
 *  allocation is derived from a rater's position in that list. A typo in a free-text ID
 *  would silently hand someone the wrong slice and leave narratives unrated. */
export default function Home() {
  const [roster, setRoster] = useState<Roster | null>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/roster")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setRoster)
      .catch(() => { window.location.href = "/gate"; });
  }, []);

  useEffect(() => {
    const prev = window.localStorage.getItem("jev-gold:last-rater");
    if (prev !== null) setIdx(Number(prev));
  }, [roster]);

  function start() {
    if (idx === null || !ok || !roster) return;
    const r = roster.raters[idx];
    if (!r) { setErr("Pick your name from the list."); return; }
    window.localStorage.setItem("jev-gold:last-rater", String(idx));
    router.push(`/label?rater=${encodeURIComponent(r.id)}`);
  }

  const active = roster?.raters.filter((r) => r.active !== false).length ?? 0;

  return (
    <main className="wrap" style={{ padding: "48px 20px 64px", maxWidth: 780 }}>
      <p className="muted" style={{ letterSpacing: ".08em", fontSize: 12, margin: 0 }}>
        TEXAS CRASH NARRATIVE STUDY
      </p>
      <h1 style={{ fontSize: 28, margin: "6px 0 10px", lineHeight: 1.25 }}>
        Human reference coding
      </h1>
      <p className="muted" style={{ marginTop: 0 }}>
        You will read short police crash narratives and answer a few yes/no questions about
        each one. Every narrative is rated independently by{" "}
        {roster ? roster.replication : "several"} people, so <strong>do not discuss
        individual narratives with other raters while coding</strong> — the agreement between
        you is the measurement.
      </p>

      <section className="panel" style={{ padding: "18px 20px", marginTop: 24 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>How to judge</h2>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>
            <strong>Label what the narrative states, not what probably happened.</strong> If
            a crash sounds like it involved alcohol but the text never says so, the answer is
            No.
          </li>
          <li style={{ marginBottom: 8 }}>
            Read the <strong>criteria</strong> shown with each question. They define the
            boundary cases, and they are the same words the system was given.
          </li>
          <li style={{ marginBottom: 8 }}>
            Use <strong>Unclear</strong> when the text genuinely could be read either way.
            Do not use it to avoid deciding.
          </li>
          <li>
            Judge each question <strong>independently</strong>. The questions shown for one
            narrative are not related to each other.
          </li>
        </ol>
      </section>

      <section className="panel" style={{ padding: "18px 20px", marginTop: 14 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>Your set</h2>
        <p style={{ margin: "0 0 8px" }}>
          You start with a short <strong>calibration set</strong> that everyone codes. Those
          items let us check the whole group is applying the criteria the same way before the
          main work counts. After that you get your own assigned narratives.
        </p>
        <p className="muted" style={{ margin: 0, fontSize: 13.5 }}>
          Roughly 1.5 hours in total. Progress saves in this browser as you go, so you can
          stop and come back — but use the same browser, and download your file when you
          finish.
        </p>
      </section>

      <section className="panel" style={{ padding: "18px 20px", marginTop: 14 }}>
        <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>Confidentiality</h2>
        <p style={{ margin: "0 0 10px" }}>
          These are official crash records. Names and phone numbers were removed before we
          received them, and we ran a second automated pass plus a screening model that
          withheld any narrative still likely to carry identifying detail.
        </p>
        <p style={{ margin: 0 }} className="muted">
          If you see anything that looks like a real name, address, licence number or phone
          number, use the <strong>Flag</strong> button and move on. Do not copy narrative text
          anywhere outside this page, and do not share the link or the code.
        </p>
      </section>

      <div style={{ marginTop: 24 }}>
        <label htmlFor="rater" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Who are you?
        </label>
        <select
          id="rater"
          value={idx ?? ""}
          onChange={(e) => { setIdx(e.target.value === "" ? null : Number(e.target.value)); setErr(""); }}
          style={{
            font: "inherit", padding: "9px 12px", width: "100%",
            border: "1px solid var(--line)", borderRadius: 8,
            background: "var(--panel)", color: "var(--ink)",
          }}
        >
          <option value="">— select your name —</option>
          {roster?.raters.map((r, i) => (
            <option key={r.id} value={i} disabled={r.active === false}>
              {r.name}{r.active === false ? " (inactive)" : ""}
            </option>
          ))}
        </select>
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          {roster
            ? `${active} raters on this study. Pick the same name every time — your assigned narratives depend on it.`
            : "Loading roster…"}
        </p>
        {err && <p style={{ color: "var(--red)", fontSize: 13.5 }}>{err}</p>}

        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 14 }}>
          <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)}
                 style={{ marginTop: 3 }} />
          <span style={{ fontSize: 14 }}>
            I have read the instructions and agree to keep the narrative text confidential.
          </span>
        </label>

        <button
          onClick={start}
          disabled={idx === null || !ok}
          style={{
            marginTop: 18, padding: "11px 20px", fontWeight: 600,
            background: idx !== null && ok ? "var(--blue)" : undefined,
            color: idx !== null && ok ? "#fff" : undefined,
            borderColor: idx !== null && ok ? "var(--blue)" : undefined,
          }}
        >
          Start coding →
        </button>
      </div>
    </main>
  );
}

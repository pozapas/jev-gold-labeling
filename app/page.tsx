"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Entry page: identify the coder and state the protocol before any narrative is shown.
 *  The protocol text is the part that makes labels comparable across coders, so it is
 *  deliberately on the path in rather than hidden behind a help link. */
export default function Home() {
  const [coder, setCoder] = useState("");
  const [ok, setOk] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const prev = window.localStorage.getItem("jev-gold:last-coder");
    if (prev) setCoder(prev);
  }, []);

  function start() {
    const id = coder.trim();
    if (!id || !ok) return;
    window.localStorage.setItem("jev-gold:last-coder", id);
    router.push(`/label?coder=${encodeURIComponent(id)}`);
  }

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
        each one. Roughly 400 narratives, about 2,500 questions in total. Work at your own
        pace; your progress is saved in this browser as you go.
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
        <h2 style={{ fontSize: 16, margin: "0 0 10px" }}>Before you start</h2>
        <p style={{ margin: "0 0 10px" }}>
          These narratives are official crash records. Names and phone numbers were replaced
          before we received them, and we ran a second automated pass plus a screening model
          that removed any narrative still likely to contain identifying detail.
        </p>
        <p style={{ margin: 0 }} className="muted">
          If you ever see something that looks like a real person&rsquo;s name, address,
          licence number or phone number, use the <strong>Flag</strong> button on that
          narrative and move on. Do not copy narrative text anywhere outside this page, and
          do not share the link.
        </p>
      </section>

      <div style={{ marginTop: 24 }}>
        <label htmlFor="coder" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
          Your coder ID
        </label>
        <input
          id="coder"
          type="text"
          value={coder}
          placeholder="e.g. AR, or your initials"
          onChange={(e) => setCoder(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && start()}
        />
        <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
          Use the same ID every time so your progress is picked up where you left it. Two
          people must never share an ID.
        </p>

        <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginTop: 14 }}>
          <input
            type="checkbox"
            checked={ok}
            onChange={(e) => setOk(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span style={{ fontSize: 14 }}>
            I have read the instructions above and agree to keep the narrative text
            confidential.
          </span>
        </label>

        <button
          onClick={start}
          disabled={!coder.trim() || !ok}
          style={{
            marginTop: 18, padding: "11px 20px", fontWeight: 600,
            background: coder.trim() && ok ? "var(--blue)" : undefined,
            color: coder.trim() && ok ? "#fff" : undefined,
            borderColor: coder.trim() && ok ? "var(--blue)" : undefined,
          }}
        >
          Start coding →
        </button>
      </div>
    </main>
  );
}

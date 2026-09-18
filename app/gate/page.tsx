"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}

function Gate() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const next = useSearchParams().get("next") || "/";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/gate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (r.ok) {
        router.replace(next);
        router.refresh();
      } else {
        const j = await r.json().catch(() => ({}));
        setErr(j.error || "That code is not right.");
      }
    } catch {
      setErr("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{
      minHeight: "100dvh", display: "grid", placeItems: "center", padding: 20,
    }}>
      <form onSubmit={submit} className="panel" style={{ padding: 28, width: "min(420px, 100%)" }}>
        <p className="muted" style={{ letterSpacing: ".08em", fontSize: 11, margin: 0 }}>
          TEXAS CRASH NARRATIVE STUDY
        </p>
        <h1 style={{ fontSize: 21, margin: "6px 0 6px" }}>Access code</h1>
        <p className="muted" style={{ marginTop: 0, fontSize: 14 }}>
          Enter the code you were given. If you do not have one, contact the study team —
          please do not share the link or the code.
        </p>

        <input
          type="password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Access code"
          autoFocus
          autoComplete="off"
          style={{ marginTop: 6 }}
        />
        {err && (
          <p style={{ color: "var(--red)", fontSize: 13.5, margin: "10px 0 0" }} role="alert">
            {err}
          </p>
        )}
        <button
          type="submit"
          disabled={!code.trim() || busy}
          style={{
            marginTop: 16, width: "100%", padding: "11px 0", fontWeight: 600,
            background: code.trim() && !busy ? "var(--blue)" : undefined,
            color: code.trim() && !busy ? "#fff" : undefined,
            borderColor: code.trim() && !busy ? "var(--blue)" : undefined,
          }}
        >
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}

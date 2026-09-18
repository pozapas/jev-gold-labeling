# Human reference coding app (gold set)

Blind labelling of Texas crash narratives for §4.4 of Paper 1. Deploys to Vercel as a static
Next.js app; coders open a link, label, and send back a JSON file.

## What it is

400 narratives, 2,465 judgments, drawn probability-stratified from the Stage-2 random
stratum. Each narrative shows the variables to judge with **the same criteria text the model
was given**, and three buttons: Yes / No / Unclear.

**It is blind by construction.** `public/data/gold_tasks.json` contains no model output —
no probabilities, no predicted labels, nothing derived from Jev. The probabilities are what
this exercise exists to audit, so showing them would anchor the labels and destroy the
reference. Labels are joined back to the model output by `Crash_ID` after collection.

## PII gate

Nothing reaches a coder that has not passed three steps, all enforced in
`paper1/src/s15_gold_export.py`:

1. **Second-pass regex redaction** on top of the data owner's `[NAME]`/`[PHONE]` pass —
   dates, DOB tokens, ID and licence numbers, long digit runs, case numbers, titled names.
2. **A model-based screen.** The `pii_residual` question is run over the *redacted* text and
   any narrative scoring above 0.2 is **withheld entirely**. On the current draw that removed
   137 of 640 candidates (21%). The frame is oversampled 1.6× precisely so that withholding
   this many still leaves the designed 400.
3. **A hard assertion on export** — the build fails if any shipped narrative still matches a
   PII pattern.

The screen earns its place: regex alone left only 4 hits, while the model flagged 136, and
those flags track real signal (phone placeholders appear in 16% of flagged vs 3% of cleared
narratives; street-address patterns 6% vs 0%).

Coders also get a **Flag PII** button on every narrative. Treat any flag as a defect: pull
the narrative, re-screen, and report it.

## Run locally

```bash
npm install
npm run dev     # http://localhost:3000
```

## Deploy

```bash
npx vercel --prod
```

It is a static export with no secrets and no server state, so no environment variables are
required. **Restrict access before sharing**: enable Vercel Deployment Protection (Vercel
Authentication, or a shared password) on the project. The narratives are not public data.

## How coders work

1. Open the link, enter a coder ID, tick the confidentiality box.
2. Label. `1` = Yes, `2` = No, `3` = Unclear; `←` `→` move between narratives.
3. Progress autosaves to that browser's local storage, so a reload resumes in place.
4. When finished (or at the end of a session), click **Download my labels** and send the
   file back.

Two coders must never share an ID. The first 100 narratives are **double-coded** — assign
them to two coders so Cohen's kappa can be estimated per §4.4.

Local storage is per browser and per profile. It survives reloads, not a cleared cache or a
different machine, which is why the downloaded file is the deliverable rather than a
convenience.

## Ingest

Put the returned files anywhere and run:

```bash
python paper1/src/s16_gold_ingest.py path/to/gold-labels-*.json
```

That merges coders, computes Cohen's kappa on the double-coded subset, joins the labels to
the model output by `Crash_ID`, and writes `paper1/data/gold/gold_labels.csv` plus a
reliability report. The Paper 1 analysis picks it up from there.

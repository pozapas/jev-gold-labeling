# Human reference coding app (gold set)

Blind panel labelling of Texas crash narratives for §4.4 of Paper 1. Raters open a link,
enter an access code, label their assigned slice, and send back a JSON file.

## What it is

400 narratives, 2,465 judgments, drawn probability-stratified from the Stage-2 random
stratum. Each narrative shows the variables to judge with **the same criteria text the model
was given**, and three buttons: Yes / No / Unclear.

**It is a panel, not a split.** Every narrative is rated independently by `replication`
raters (default 3), and a short calibration set is rated by everyone. Splitting 400
narratives N ways would give one rating per item and no way to measure how noisy the labels
are -- which matters more than size here, because this set is the reference everything else
is measured against. With three ratings you get a majority vote and a per-rater reliability
estimate; with 16 raters it is also *less* work each (~1.8 h) than three coders doing a
single pass (~3.6 h).

Allocation is deterministic from a rater's position in `data/roster.json`: narrative *j*
goes to raters *(j + k·⌊N/R⌋) mod N*. No server state, no coordination, and a reload or a
different machine yields the same slice. At N=16, R=3 that is 72-73 assigned narratives
each plus the 15 shared calibration items, with every item covered exactly three times.

**It is blind by construction.** `data/gold_tasks.json` contains no model output —
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

Already deployed at **https://jev-gold-labeling.vercel.app** from the private repo
`pozapas/jev-gold-labeling`; every push to `master` redeploys.

Access is a shared code, held as a salted SHA-256 in `lib/gate.ts` — the code itself is
never committed. Rotate it with:

```bash
node scripts/set-code.mjs "NEW-CODE-HERE"   # paste the printed hash into lib/gate.ts
```

Rotating invalidates every issued session cookie. Vercel Authentication is deliberately OFF,
because it would require raters to hold Vercel accounts; the code gate is the barrier, and
the narratives are reachable only through `/api/tasks`, which re-checks the cookie itself.

## Setting up the panel

1. Edit `data/roster.json`: replace the placeholder names with your raters, keep the ids
   stable, and push. **Order matters** — allocation derives from position in that list, so
   reordering or removing an entry reshuffles who codes what. To drop someone after coding
   starts, leave the entry and set `"active": false`.
2. Set `replication` (3 is the default) and `calibration_n` (15).
3. Give each rater the link and the access code personally.

## How raters work

1. Open the link, enter the access code, pick their name from the roster.
2. Label. `1` = Yes, `2` = No, `3` = Unclear; `←` `→` move between narratives.
3. Progress autosaves to that browser's local storage, so a reload resumes in place.
4. At the end of a session, click **Download my labels** and send the file back.

Everyone starts with the shared **calibration set**, which is what makes the panel
comparable: it is the only block where all raters see the same items, so it carries the
pairwise kappas and the per-rater agreement-with-majority score. Tell raters **not to
discuss individual narratives while coding** — the agreement between them is the
measurement, and a corridor conversation destroys it.

Local storage is per browser and per profile. It survives reloads, not a cleared cache or a
different machine, which is why the downloaded file is the deliverable rather than a
convenience.

## Ingest

Put the returned files anywhere and run:

```bash
python paper1/src/s16_gold_ingest.py path/to/gold-labels-*.json
```

That merges raters, measures reliability on the calibration set (pairwise kappa plus a
per-rater agreement-with-majority score, flagged against the panel's own median rather than
a fixed cut), resolves each pair by **majority vote** — marking ties and no-majority cases
`DISPUTED` rather than inventing agreement — joins to the model output by `Crash_ID`, and
writes `paper1/data/gold/gold_labels.csv` plus a reliability report.

Adjudicate the `DISPUTED` rows before using the set as a reference. In a 16-rater dry run
only 17 of 2,465 pairs were disputed, so this is a short list, not a second coding pass.

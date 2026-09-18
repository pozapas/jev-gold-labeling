/** Work allocation across a panel of raters.
 *
 * Splitting 400 narratives N ways would give one rating per item and no way to measure how
 * noisy the labels are — and the gold set exists to BE the reference, so its own noise
 * matters more than its size. Instead every narrative is rated `replication` times by
 * distinct raters, which supports a majority vote and a per-rater reliability estimate.
 *
 * Allocation is deterministic from a rater's index in the roster, so no server state, no
 * coordination, and a rater who reloads or switches machines gets the same slice.
 *
 * Narrative j goes to raters { (j + k*step) mod N : k < R }, step = floor(N / R). With
 * N=16, R=3 that is j, j+5, j+10 — three distinct raters, and every rater receives exactly
 * R*T/N narratives. Where N is not divisible by R the loads differ by at most one.
 */

export interface Rater {
  id: string;
  name: string;
  active?: boolean;
}

export interface Roster {
  replication: number;
  calibration_n: number;
  raters: Rater[];
}

/** Indices (into the full task list) that this rater is responsible for. */
export function assignmentFor(
  raterIndex: number, nTasks: number, roster: Roster
): { calibration: number[]; assigned: number[] } {
  const N = roster.raters.length;
  const R = Math.max(1, Math.min(roster.replication, N));
  const cal = Math.max(0, Math.min(roster.calibration_n, nTasks));
  const step = Math.max(1, Math.floor(N / R));

  const calibration: number[] = [];
  for (let j = 0; j < cal; j++) calibration.push(j);

  const assigned: number[] = [];
  for (let j = cal; j < nTasks; j++) {
    for (let k = 0; k < R; k++) {
      if ((j + k * step) % N === raterIndex) { assigned.push(j); break; }
    }
  }
  return { calibration, assigned };
}

/** Sanity figures for the roster as configured, used by the entry page and by tests. */
export function allocationSummary(nTasks: number, roster: Roster) {
  const N = roster.raters.length;
  const cal = Math.max(0, Math.min(roster.calibration_n, nTasks));
  const perRater = Array.from({ length: N }, (_, i) =>
    assignmentFor(i, nTasks, roster).assigned.length);
  const coverage = new Array(nTasks).fill(0);
  for (let i = 0; i < N; i++) {
    for (const j of assignmentFor(i, nTasks, roster).assigned) coverage[j]++;
  }
  const own = coverage.slice(cal);
  return {
    nRaters: N,
    replication: roster.replication,
    calibrationN: cal,
    perRaterMin: Math.min(...perRater),
    perRaterMax: Math.max(...perRater),
    coverageMin: own.length ? Math.min(...own) : 0,
    coverageMax: own.length ? Math.max(...own) : 0,
  };
}

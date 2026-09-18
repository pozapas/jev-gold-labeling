/** Shared types for the gold-set labelling app.
 *
 * The dataset is deliberately blind: it carries the narrative, the variables to judge, and
 * the criteria text the model saw -- and no model output. The probabilities are what this
 * exercise exists to audit, so showing them would anchor the labels.
 */

export type Verdict = "yes" | "no" | "unclear";

export interface Criterion {
  instructions: string;
  true: string;
  false: string;
}

export interface Task {
  id: number;
  text: string;
  vars: string[];
}

export interface Dataset {
  generated: string;
  n_tasks: number;
  n_judgments: number;
  double_coded_ids: number[];
  pii: { threshold: number; n_withheld: number; screen: string };
  blinding: string;
  criteria: Record<string, Criterion>;
  tasks: Task[];
}

/** One coder's answer for one (narrative, variable) pair. */
export interface Label {
  taskId: number;
  variable: string;
  verdict: Verdict;
  /** Wall-clock ms spent on the narrative when this answer was given; used to spot
   *  rushed batches during quality control, not to rank coders. */
  ms: number;
  ts: number;
}

export interface Session {
  coder: string;
  started: number;
  labels: Record<string, Label>; // key: `${taskId}:${variable}`
  notes: Record<number, string>;
  /** Index the coder is currently on, so a reload resumes in place. */
  cursor: number;
}

export const KEY = (taskId: number, v: string) => `${taskId}:${v}`;

export const VERDICTS: { v: Verdict; label: string; hint: string; key: string }[] = [
  { v: "yes", label: "Yes", hint: "The narrative states this", key: "1" },
  { v: "no", label: "No", hint: "The narrative does not state this", key: "2" },
  { v: "unclear", label: "Unclear", hint: "Cannot tell from the text alone", key: "3" },
];

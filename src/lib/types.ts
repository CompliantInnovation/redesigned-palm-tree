export type ActivityType = "SURVEY" | "FUNCTIONAL_TEST";
export type InvolvedSide = "LEFT" | "RIGHT";
export type Phase = "pre" | "post";

export interface CatalogActivity {
  id: string;
  name: string;
  type: ActivityType;
}

/**
 * An activity on the combined VELYS timeline. `performanceWindowStart` is in
 * VELYS days relative to surgery (day 0), so pre-op activities are negative.
 */
export interface PlanActivity {
  id: string;
  performanceWindowStart: number;
  performanceWindowLength: number;
  involvedSide?: InvolvedSide;
  _instanceId: string;
}

export interface PlanMeta {
  name: string;
  description: string;
}

/** User overrides for an assessment, keyed by its window (see windowKey). */
export interface AssessmentMeta {
  dueDay?: number;
  slug?: string;
  title?: string;
  required?: boolean;
}

/** A pre-op + post-op pair of Laina plans edited together. */
export interface Plan {
  pre: PlanMeta;
  post: PlanMeta;
  /** Laina pre-op plan day 0 is VELYS day -preOpDays. */
  preOpDays: number;
  defaultSide?: InvolvedSide;
  activities: PlanActivity[];
  assessments: Record<string, AssessmentMeta>;
}

/** Laina's plan format (the body sent to the Laina API). Days are Laina days. */
export interface ExportedPlan {
  planName: string;
  activities: {
    id: string;
    performanceWindowStart: number;
    performanceWindowLength: number;
    involvedSide?: InvolvedSide;
  }[];
}

/** An assessment as stored in the VELYS performance window file. */
export interface StoredAssessment {
  slug: string;
  title: string;
  delta_days: number;
  performance_window: {
    days_pre: number;
    days_post: number;
  };
  required: boolean;
}

/** The plan file VELYS stores (referenced by the index record's fileKey). */
export interface StoredPlanFile extends ExportedPlan {
  name: string;
  description: string;
  uri: string;
  assessments: StoredAssessment[];
}

export interface IndexRecord {
  name: string;
  title: string;
  provider: string;
  uri: string;
  contentType: string;
}

export interface BundlePlan {
  phase: Phase;
  index: number;
  /** VELYS day (relative to surgery) that corresponds to Laina day 0. */
  lainaDayZero: number;
  laina: ExportedPlan;
  indexRecord: IndexRecord;
  planFile: StoredPlanFile;
}

export interface PlanBundle {
  bundleVersion: 1;
  planIdPlaceholder: string;
  preOpDays: number;
  defaultSide?: InvolvedSide;
  plans: BundlePlan[];
}

export type PlanAction =
  | { type: "SET_PLAN_META"; phase: Phase; field: keyof PlanMeta; value: string }
  | { type: "SET_PRE_OP_DAYS"; days: number }
  | { type: "SET_DEFAULT_SIDE"; side?: InvolvedSide }
  | { type: "SET_ASSESSMENT_META"; key: string; patch: AssessmentMeta }
  | { type: "SET_ASSESSMENT_WINDOW"; key: string; start: number; length: number }
  | { type: "ADD_ACTIVITY"; id: string; performanceWindowStart: number }
  | { type: "REMOVE_ACTIVITY"; instanceId: string }
  | { type: "MOVE_ACTIVITY"; instanceId: string; performanceWindowStart: number }
  | { type: "RESIZE_ACTIVITY"; instanceId: string; performanceWindowLength: number }
  | { type: "SET_INVOLVED_SIDE"; instanceId: string; involvedSide?: InvolvedSide }
  | { type: "DUPLICATE_ACTIVITY"; instanceId: string }
  | { type: "REORDER_ACTIVITY"; fromIndex: number; toIndex: number }
  | { type: "IMPORT_PHASE"; phase: Phase; plan: ExportedPlan; meta?: Partial<PlanMeta>; assessments?: StoredAssessment[] }
  | { type: "IMPORT_SEQUENCE"; plan: Plan }
  | { type: "CLEAR_PLAN" };

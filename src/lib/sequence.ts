import {
  AssessmentMeta,
  BundlePlan,
  ExportedPlan,
  InvolvedSide,
  Phase,
  Plan,
  PlanActivity,
  PlanBundle,
  StoredAssessment,
  StoredPlanFile,
} from "./types";
import {
  DEFAULT_PRE_OP_DAYS,
  LAINA_PROVIDER,
  MAX_PRE_OP_DAYS,
  PHASE_INDEX,
  PLAN_CONTENT_TYPE,
  PLAN_ID_PLACEHOLDER,
} from "./constants";
import { generateInstanceId, getActivityName, validateImportedPlan } from "./utils";

export const PHASES: Phase[] = ["pre", "post"];

export const PHASE_LABELS: Record<Phase, string> = {
  pre: "Pre-op",
  post: "Post-op",
};

export function createEmptyPlan(): Plan {
  return {
    pre: { name: "", description: "" },
    post: { name: "", description: "" },
    preOpDays: DEFAULT_PRE_OP_DAYS,
    activities: [],
    assessments: {},
  };
}

// --- Timeline / phase mapping ---

/** Activities starting before surgery (day 0) belong to the pre-op plan. */
export function phaseOf(start: number): Phase {
  return start < 0 ? "pre" : "post";
}

export function phaseActivities(plan: Plan, phase: Phase): PlanActivity[] {
  return plan.activities.filter((a) => phaseOf(a.performanceWindowStart) === phase);
}

/** VELYS day (relative to surgery) -> day in the phase's Laina plan. */
export function toLainaDay(phase: Phase, day: number, preOpDays: number): number {
  return phase === "pre" ? day + preOpDays : day;
}

/** Day in the phase's Laina plan -> VELYS day (relative to surgery). */
export function fromLainaDay(phase: Phase, day: number, preOpDays: number): number {
  return phase === "pre" ? day - preOpDays : day;
}

export function clampPreOpDays(days: number): number {
  return Math.min(MAX_PRE_OP_DAYS, Math.max(1, Math.round(days)));
}

// --- Assessments ---

/** Activities sharing an identical window form one assessment. Keys use VELYS days. */
export function windowKey(start: number, length: number): string {
  return `${start}:${length}`;
}

export interface DerivedAssessment {
  key: string;
  phase: Phase;
  start: number;
  length: number;
  dueDay: number;
  slug: string;
  title: string;
  required: boolean;
  autoSlug: string;
  autoTitle: string;
  activities: PlanActivity[];
}

function pluralize(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

function autoLabels(phase: Phase, dueDay: number, phaseCount: number): { slug: string; title: string } {
  if (phase === "pre") {
    if (phaseCount === 1) return { slug: "pre-op", title: "Pre-operative Assessment" };
    const days = -dueDay;
    return { slug: `pre-op-${days}`, title: `${pluralize(days, "Day")} Pre-operative` };
  }
  if (dueDay === 0) return { slug: "post-op-0", title: "Day of Surgery" };
  if (dueDay % 365 === 0) {
    return { slug: `post-op-${dueDay}`, title: `${pluralize(dueDay / 365, "Year")} Post-operative` };
  }
  return { slug: `post-op-${dueDay}`, title: `${pluralize(dueDay, "Day")} Post-operative` };
}

/** The due day must fall on a day the Laina window is open: [start, start + length - 1]. */
export function clampDueDay(dueDay: number, start: number, length: number): number {
  return Math.min(start + length - 1, Math.max(start, Math.round(dueDay)));
}

export function deriveAssessments(plan: Plan, phase: Phase): DerivedAssessment[] {
  const groups = new Map<string, PlanActivity[]>();
  for (const a of phaseActivities(plan, phase)) {
    const key = windowKey(a.performanceWindowStart, a.performanceWindowLength);
    const group = groups.get(key);
    if (group) group.push(a);
    else groups.set(key, [a]);
  }

  const windows = [...groups.entries()]
    .map(([key, activities]) => ({
      key,
      activities,
      start: activities[0].performanceWindowStart,
      length: activities[0].performanceWindowLength,
    }))
    .sort((a, b) => a.start - b.start || a.length - b.length);

  return windows.map(({ key, activities, start, length }) => {
    const meta: AssessmentMeta = plan.assessments[key] ?? {};
    const dueDay = clampDueDay(meta.dueDay ?? start, start, length);
    const auto = autoLabels(phase, dueDay, windows.length);
    return {
      key,
      phase,
      start,
      length,
      dueDay,
      slug: meta.slug || auto.slug,
      title: meta.title || auto.title,
      required: meta.required ?? true,
      autoSlug: auto.slug,
      autoTitle: auto.title,
      activities,
    };
  });
}

export function toStoredAssessment(a: DerivedAssessment): StoredAssessment {
  return {
    slug: a.slug,
    title: a.title,
    delta_days: a.dueDay,
    performance_window: {
      days_pre: a.dueDay - a.start,
      days_post: a.start + a.length - a.dueDay,
    },
    required: a.required,
  };
}

/** Inverse of toStoredAssessment: the VELYS window an assessment covers. */
function storedAssessmentWindow(a: StoredAssessment): { start: number; length: number } {
  return {
    start: a.delta_days - a.performance_window.days_pre,
    length: a.performance_window.days_pre + a.performance_window.days_post,
  };
}

// --- Export ---

export function buildUri(phase: Phase, side?: InvolvedSide): string {
  const params = new URLSearchParams();
  if (side) params.set("side", side.toLowerCase());
  params.set("index", String(PHASE_INDEX[phase]));
  return `lainahealth://plan/${PLAN_ID_PLACEHOLDER}?${params.toString()}`;
}

export function exportLainaPlan(plan: Plan, phase: Phase): ExportedPlan {
  return {
    planName: plan[phase].name,
    activities: phaseActivities(plan, phase).map(
      ({ id, performanceWindowStart, performanceWindowLength, involvedSide }) => {
        const activity: ExportedPlan["activities"][number] = {
          id,
          performanceWindowStart: toLainaDay(phase, performanceWindowStart, plan.preOpDays),
          performanceWindowLength,
        };
        if (involvedSide) {
          activity.involvedSide = involvedSide;
        }
        return activity;
      }
    ),
  };
}

function buildBundlePlan(plan: Plan, phase: Phase): BundlePlan {
  const laina = exportLainaPlan(plan, phase);
  const meta = plan[phase];
  const uri = buildUri(phase, plan.defaultSide);
  const planFile: StoredPlanFile = {
    name: meta.name,
    description: meta.description || meta.name,
    planName: laina.planName,
    uri,
    activities: laina.activities,
    assessments: deriveAssessments(plan, phase).map(toStoredAssessment),
  };
  return {
    phase,
    index: PHASE_INDEX[phase],
    lainaDayZero: fromLainaDay(phase, 0, plan.preOpDays),
    laina,
    indexRecord: {
      name: meta.name,
      title: meta.name,
      provider: LAINA_PROVIDER,
      uri,
      contentType: PLAN_CONTENT_TYPE,
    },
    planFile,
  };
}

export function buildBundle(plan: Plan): PlanBundle {
  const bundle: PlanBundle = {
    bundleVersion: 1,
    planIdPlaceholder: PLAN_ID_PLACEHOLDER,
    preOpDays: plan.preOpDays,
    plans: PHASES.map((phase) => buildBundlePlan(plan, phase)),
  };
  if (plan.defaultSide) bundle.defaultSide = plan.defaultSide;
  return bundle;
}

// --- Import ---

/**
 * Replaces one phase's activities with a Laina plan (Laina days) and, when given,
 * restores assessment metadata from a stored plan file.
 */
export function importPhase(
  state: Plan,
  phase: Phase,
  laina: ExportedPlan,
  meta?: Partial<{ name: string; description: string }>,
  storedAssessments?: StoredAssessment[]
): Plan {
  let preOpDays = state.preOpDays;
  if (phase === "pre") {
    // Make sure every pre-op window still ends on or before surgery.
    const lainaEnd = Math.max(0, ...laina.activities.map((a) => a.performanceWindowStart + a.performanceWindowLength));
    preOpDays = clampPreOpDays(Math.max(preOpDays, lainaEnd));
  }

  const imported: PlanActivity[] = laina.activities.map((a) => ({
    ...a,
    performanceWindowStart: fromLainaDay(phase, a.performanceWindowStart, preOpDays),
    _instanceId: generateInstanceId(),
  }));

  // Replace the phase's activities in place (keeping row order and instance IDs, so
  // JSON edits don't reshuffle the chart or drop the selection); extras go at the end.
  let replaced = 0;
  const activities = state.activities.flatMap((a) => {
    if (phaseOf(a.performanceWindowStart) !== phase) return [a];
    if (replaced >= imported.length) return [];
    return [{ ...imported[replaced++], _instanceId: a._instanceId }];
  });
  const extras = imported.slice(replaced);
  if (phase === "pre" && replaced === 0) activities.unshift(...extras);
  else activities.push(...extras);

  let next: Plan = {
    ...state,
    preOpDays,
    activities,
    [phase]: {
      name: meta?.name ?? laina.planName,
      description: meta?.description ?? state[phase].description,
    },
  };

  if (storedAssessments) {
    next = { ...next, assessments: { ...next.assessments, ...matchStoredAssessments(next, phase, storedAssessments) } };
  }
  return next;
}

function matchStoredAssessments(
  plan: Plan,
  phase: Phase,
  stored: StoredAssessment[]
): Record<string, AssessmentMeta> {
  const windows = deriveAssessments(plan, phase);
  const result: Record<string, AssessmentMeta> = {};
  for (const s of stored) {
    const { start, length } = storedAssessmentWindow(s);
    // Prefer an exact window match; otherwise fall back to the only window containing the due day.
    let target = windows.find((w) => w.start === start && w.length === length);
    if (!target) {
      const containing = windows.filter(
        (w) => s.delta_days >= w.start && s.delta_days <= w.start + w.length - 1
      );
      if (containing.length === 1) target = containing[0];
    }
    if (!target) continue;
    const auto = autoLabels(phase, s.delta_days, windows.length);
    result[target.key] = {
      dueDay: s.delta_days,
      slug: s.slug !== auto.slug ? s.slug : undefined,
      title: s.title !== auto.title ? s.title : undefined,
      required: s.required,
    };
  }
  return result;
}

export function sequenceFromBundle(bundle: PlanBundle): Plan {
  let plan: Plan = {
    ...createEmptyPlan(),
    preOpDays: clampPreOpDays(bundle.preOpDays),
    defaultSide: bundle.defaultSide,
  };
  for (const p of bundle.plans) {
    plan = importPhase(
      plan,
      p.phase,
      p.planFile,
      { name: p.planFile.name, description: p.planFile.description },
      p.planFile.assessments
    );
  }
  return plan;
}

export type ImportedFile =
  | { kind: "bundle"; bundle: PlanBundle }
  | { kind: "stored"; phase?: Phase; side?: InvolvedSide; file: StoredPlanFile }
  | { kind: "laina"; plan: ExportedPlan };

function parseUriParams(uri: unknown): { phase?: Phase; side?: InvolvedSide } {
  if (typeof uri !== "string") return {};
  const query = uri.split("?")[1];
  if (!query) return {};
  const params = new URLSearchParams(query);
  const index = params.get("index");
  const side = params.get("side")?.toUpperCase();
  return {
    phase: index === "1" ? "pre" : index === "2" ? "post" : undefined,
    side: side === "LEFT" || side === "RIGHT" ? side : undefined,
  };
}

function isBundle(data: unknown): data is PlanBundle {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    obj.bundleVersion === 1 &&
    Array.isArray(obj.plans) &&
    obj.plans.every((p: unknown) => {
      const plan = p as Record<string, unknown> | null;
      return (
        !!plan &&
        (plan.phase === "pre" || plan.phase === "post") &&
        validateImportedPlan(plan.planFile) &&
        Array.isArray((plan.planFile as unknown as StoredPlanFile).assessments)
      );
    })
  );
}

export function classifyImport(data: unknown): ImportedFile | null {
  if (isBundle(data)) return { kind: "bundle", bundle: data };
  if (!validateImportedPlan(data)) return null;
  const obj = data as unknown as Record<string, unknown>;
  if (Array.isArray(obj.assessments)) {
    const file = data as StoredPlanFile;
    const { phase, side } = parseUriParams(file.uri);
    const inferred = phase ?? (file.assessments.some((a) => a.delta_days < 0) ? "pre" : undefined);
    return { kind: "stored", phase: inferred, side, file };
  }
  return { kind: "laina", plan: data };
}

// --- Validation ---

export interface Issue {
  level: "error" | "warning";
  message: string;
}

export function validateSequence(plan: Plan): Issue[] {
  const issues: Issue[] = [];

  for (const phase of PHASES) {
    const label = PHASE_LABELS[phase];
    if (!plan[phase].name.trim()) {
      issues.push({ level: "error", message: `${label} plan name is required.` });
    }
    if (phaseActivities(plan, phase).length === 0) {
      issues.push({ level: "warning", message: `${label} plan has no activities.` });
    }
    const slugs = new Map<string, number>();
    for (const a of deriveAssessments(plan, phase)) {
      slugs.set(a.slug, (slugs.get(a.slug) ?? 0) + 1);
    }
    for (const [slug, count] of slugs) {
      if (count > 1) {
        issues.push({ level: "error", message: `${label}: slug "${slug}" is used by ${count} assessments.` });
      }
    }
  }

  for (const a of plan.activities) {
    const start = a.performanceWindowStart;
    const end = start + a.performanceWindowLength;
    const name = getActivityName(a.id);
    if (start < 0 && end > 0) {
      issues.push({
        level: "error",
        message: `${name} (day ${start} to ${end}) crosses the day of surgery. Pre-op windows must end by day 0.`,
      });
    }
    if (start < -plan.preOpDays) {
      issues.push({
        level: "error",
        message: `${name} starts on day ${start}, before the pre-op plan begins (day ${-plan.preOpDays}).`,
      });
    }
  }

  return issues;
}

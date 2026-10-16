"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AssessmentMeta, InvolvedSide, Phase, Plan, PlanAction } from "@/lib/types";
import { MAX_PRE_OP_DAYS, MIN_WINDOW_LENGTH } from "@/lib/constants";
import { getActivityName } from "@/lib/utils";
import {
  DerivedAssessment,
  Issue,
  PHASES,
  PHASE_LABELS,
  buildUri,
  deriveAssessments,
  toLainaDay,
  toStoredAssessment,
} from "@/lib/sequence";

interface PlanSidebarProps {
  plan: Plan;
  dispatch: React.Dispatch<PlanAction>;
  issues: Issue[];
  selectedInstanceId: string | null;
}

const inputClass =
  "w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none";

/** Number input that keeps its own text while editing and commits on blur / Enter. */
function NumberField({
  value,
  onCommit,
  min,
  max,
  className = "",
}: {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const [text, setText] = useState(String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  const commit = () => {
    const n = Number(text);
    if (text.trim() === "" || !Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, Math.round(n)));
    setText(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <input
      type="number"
      value={text}
      min={min}
      max={max}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; commit(); }}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className={`${inputClass} ${className}`}
    />
  );
}

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="border-b border-gray-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function PlanMetaFields({ plan, phase, dispatch }: { plan: Plan; phase: Phase; dispatch: React.Dispatch<PlanAction> }) {
  const meta = plan[phase];
  return (
    <div className="mb-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
            phase === "pre" ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
          }`}
        >
          {PHASE_LABELS[phase]}
        </span>
        <code className="truncate text-[10px] text-gray-400" title={buildUri(phase, plan.defaultSide)}>
          {buildUri(phase, plan.defaultSide)}
        </code>
      </div>
      <input
        type="text"
        value={meta.name}
        onChange={(e) => dispatch({ type: "SET_PLAN_META", phase, field: "name", value: e.target.value })}
        placeholder={`${PHASE_LABELS[phase]} plan name…`}
        className={inputClass}
      />
      <input
        type="text"
        value={meta.description}
        onChange={(e) => dispatch({ type: "SET_PLAN_META", phase, field: "description", value: e.target.value })}
        placeholder={meta.name ? `Description (defaults to "${meta.name}")` : "Description (defaults to name)"}
        className={inputClass}
      />
    </div>
  );
}

function AssessmentCard({
  assessment,
  preOpDays,
  dispatch,
  isSelected,
}: {
  assessment: DerivedAssessment;
  preOpDays: number;
  dispatch: React.Dispatch<PlanAction>;
  isSelected: boolean;
}) {
  const { key, phase, start, length, dueDay } = assessment;
  const end = start + length - 1;
  const stored = toStoredAssessment(assessment);
  const lainaStart = toLainaDay(phase, start, preOpDays);
  const setMeta = (patch: AssessmentMeta) => dispatch({ type: "SET_ASSESSMENT_META", key, patch });
  const names = assessment.activities.map((a) =>
    a.involvedSide ? `${getActivityName(a.id)} (${a.involvedSide[0]})` : getActivityName(a.id)
  );

  return (
    <div
      className={`rounded border bg-white p-2 text-xs ${
        isSelected ? "border-yellow-400 ring-2 ring-yellow-300" : "border-gray-200"
      }`}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="font-semibold text-gray-800">{assessment.title}</span>
        <span className="flex-shrink-0 text-[10px] text-gray-400" title="Window in the Laina plan">
          Laina {lainaStart}+{length}
        </span>
      </div>
      <p className="mb-2 line-clamp-2 text-[10px] text-gray-500" title={names.join(", ")}>
        {names.length} {names.length === 1 ? "activity" : "activities"}: {names.join(", ")}
      </p>

      <div className="mb-1.5 grid grid-cols-3 gap-1.5">
        <label className="text-[10px] text-gray-500">
          Window start
          <NumberField
            value={start}
            min={-preOpDays}
            onCommit={(v) => dispatch({ type: "SET_ASSESSMENT_WINDOW", key, start: v, length })}
          />
        </label>
        <label className="text-[10px] text-gray-500">
          Length
          <NumberField
            value={length}
            min={MIN_WINDOW_LENGTH}
            onCommit={(v) => dispatch({ type: "SET_ASSESSMENT_WINDOW", key, start, length: v })}
          />
        </label>
        <label className="text-[10px] font-semibold text-gray-700">
          Due day
          <NumberField value={dueDay} min={start} max={end} onCommit={(v) => setMeta({ dueDay: v })} className="border-blue-300" />
        </label>
      </div>
      <input
        type="range"
        min={start}
        max={end}
        value={dueDay}
        disabled={start === end}
        onChange={(e) => setMeta({ dueDay: Number(e.target.value) })}
        className="mb-1.5 w-full accent-blue-500"
        title={`Due day ${dueDay} (window ${start} to ${end})`}
      />

      <div className="mb-1.5 grid grid-cols-2 gap-1.5">
        <input
          type="text"
          value={assessment.slug === assessment.autoSlug ? "" : assessment.slug}
          onChange={(e) => setMeta({ slug: e.target.value || undefined })}
          placeholder={assessment.autoSlug}
          className={`${inputClass} font-mono`}
          title="Slug (leave blank for the default)"
        />
        <input
          type="text"
          value={assessment.title === assessment.autoTitle ? "" : assessment.title}
          onChange={(e) => setMeta({ title: e.target.value || undefined })}
          placeholder={assessment.autoTitle}
          className={inputClass}
          title="Title (leave blank for the default)"
        />
      </div>

      <div className="flex items-center justify-between text-[10px] text-gray-500">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={assessment.required}
            onChange={(e) => setMeta({ required: e.target.checked })}
          />
          Required
        </label>
        <code title="delta_days / performance_window">
          Δ{stored.delta_days} · pre {stored.performance_window.days_pre} · post {stored.performance_window.days_post}
        </code>
      </div>
    </div>
  );
}

export function PlanSidebar({ plan, dispatch, issues, selectedInstanceId }: PlanSidebarProps) {
  const assessmentsByPhase = useMemo(
    () => PHASES.map((phase) => ({ phase, assessments: deriveAssessments(plan, phase) })),
    [plan]
  );

  return (
    <div className="flex h-full flex-col overflow-y-auto border-l border-gray-200 bg-gray-50">
      <Section title="Plans">
        {PHASES.map((phase) => (
          <PlanMetaFields key={phase} plan={plan} phase={phase} dispatch={dispatch} />
        ))}
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[10px] text-gray-500" title="Laina's pre-op plan day 0 is this many days before surgery">
            Pre-op plan starts (days before surgery)
            <NumberField
              value={plan.preOpDays}
              min={1}
              max={MAX_PRE_OP_DAYS}
              onCommit={(days) => dispatch({ type: "SET_PRE_OP_DAYS", days })}
            />
          </label>
          <label className="text-[10px] text-gray-500" title="Added to the URI as ?side=; used when an activity has no involvedSide">
            Default side (URI)
            <select
              value={plan.defaultSide ?? ""}
              onChange={(e) =>
                dispatch({ type: "SET_DEFAULT_SIDE", side: (e.target.value || undefined) as InvolvedSide | undefined })
              }
              className={inputClass}
            >
              <option value="">None</option>
              <option value="LEFT">Left</option>
              <option value="RIGHT">Right</option>
            </select>
          </label>
        </div>
      </Section>

      {issues.length > 0 && (
        <Section title="Issues">
          <ul className="space-y-1">
            {issues.map((issue, i) => (
              <li
                key={i}
                className={`rounded px-2 py-1 text-[11px] ${
                  issue.level === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {issue.message}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {assessmentsByPhase.map(({ phase, assessments }) => (
        <Section
          key={phase}
          title={`${PHASE_LABELS[phase]} assessments`}
          right={<span className="text-[10px] text-gray-400">{assessments.length}</span>}
        >
          {assessments.length === 0 ? (
            <p className="text-[11px] text-gray-400">
              Activities sharing the same window become one assessment.
            </p>
          ) : (
            <div className="space-y-2">
              {assessments.map((a) => (
                <AssessmentCard
                  key={a.key}
                  assessment={a}
                  preOpDays={plan.preOpDays}
                  dispatch={dispatch}
                  isSelected={a.activities.some((act) => act._instanceId === selectedInstanceId)}
                />
              ))}
            </div>
          )}
        </Section>
      ))}
    </div>
  );
}

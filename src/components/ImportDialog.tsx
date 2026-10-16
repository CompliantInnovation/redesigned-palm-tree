"use client";

import { Phase, Plan } from "@/lib/types";
import { ImportedFile, PHASES, PHASE_LABELS, phaseActivities } from "@/lib/sequence";

export type PlanImport = Exclude<ImportedFile, { kind: "bundle" }>;

export interface PendingImport {
  fileName: string;
  imported: PlanImport;
  phase: Phase;
  /** Where the phase came from: the file's URI, a guess from its name, or file order. */
  source: "uri" | "name" | "order";
}

export function importedPlanName(imported: PlanImport): string {
  return imported.kind === "stored" ? imported.file.name || imported.file.planName : imported.plan.planName;
}

const SOURCE_LABELS: Record<PendingImport["source"], string> = {
  uri: "from URI index",
  name: "guessed from name",
  order: "guessed from file order",
};

interface ImportDialogProps {
  plan: Plan;
  items: PendingImport[];
  onChangePhase: (index: number, phase: Phase) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ImportDialog({ plan, items, onChangePhase, onCancel, onConfirm }: ImportDialogProps) {
  const duplicate = PHASES.find((phase) => items.filter((i) => i.phase === phase).length > 1);
  const replaced = PHASES.filter(
    (phase) => items.some((i) => i.phase === phase) && (plan[phase].name || phaseActivities(plan, phase).length > 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-labelledby="import-dialog-title"
        className="w-full max-w-lg rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 id="import-dialog-title" className="text-sm font-semibold text-gray-800">
            Import plans
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Choose which plan each file becomes. Legacy Laina plans don&apos;t say whether they are pre-op or post-op.
          </p>
        </div>

        <ul className="divide-y divide-gray-100 px-4">
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800" title={importedPlanName(item.imported)}>
                  {importedPlanName(item.imported) || "(no plan name)"}
                </p>
                <p className="truncate text-[11px] text-gray-500" title={item.fileName}>
                  {item.fileName} · {(item.imported.kind === "stored" ? item.imported.file : item.imported.plan).activities.length} activities
                  · {item.imported.kind === "stored" ? "VELYS plan file" : "Laina plan"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <div className="flex overflow-hidden rounded border border-gray-300 text-xs font-medium">
                  {PHASES.map((phase) => (
                    <button
                      key={phase}
                      onClick={() => onChangePhase(i, phase)}
                      className={`px-2.5 py-1 ${
                        item.phase === phase
                          ? phase === "pre"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-sky-100 text-sky-800"
                          : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {PHASE_LABELS[phase]}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-gray-400">{SOURCE_LABELS[item.source]}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-gray-200 px-4 py-3">
          {duplicate ? (
            <p className="mb-2 text-xs text-red-600">
              More than one file is set to {PHASE_LABELS[duplicate]}. Each plan can only come from one file.
            </p>
          ) : (
            replaced.length > 0 && (
              <p className="mb-2 text-xs text-amber-700">
                This replaces the current {replaced.map((p) => PHASE_LABELS[p]).join(" and ")} plan
                {replaced.length > 1 ? "s" : ""}.
                {PHASES.every((p) => items.some((i) => i.phase === p)) ? "" : " The other plan is kept."}
              </p>
            )
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={!!duplicate}
              className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

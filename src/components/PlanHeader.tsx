"use client";

import { useRef, useState } from "react";
import { Phase, Plan, PlanAction } from "@/lib/types";
import { downloadJson } from "@/lib/utils";
import { Issue, PHASES, buildBundle, classifyImport, sequenceFromBundle } from "@/lib/sequence";
import { ImportDialog, PendingImport, PlanImport, importedPlanName } from "./ImportDialog";

interface PlanHeaderProps {
  plan: Plan;
  dispatch: React.Dispatch<PlanAction>;
  issues: Issue[];
  children?: React.ReactNode;
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/** Guess a legacy plan's phase from its plan name or file name (e.g. "Vor der Knie OP Pre", "US - TKA Post"). */
function guessPhase(...names: string[]): Phase | undefined {
  const text = names.join(" ");
  const pre = /\b(pre|vor|preop)\b|pre[-_ ]?op/i.test(text);
  const post = /\b(post|nach|postop)\b|post[-_ ]?op/i.test(text);
  if (pre === post) return undefined;
  return pre ? "pre" : "post";
}

/** Assigns a phase to each file: URI index first, then a name guess, then whichever phase is still free. */
function assignPhases(files: { fileName: string; imported: PlanImport }[]): PendingImport[] {
  const known = files.map(({ fileName, imported }): PendingImport | { fileName: string; imported: PlanImport } => {
    if (imported.kind === "stored" && imported.phase) return { fileName, imported, phase: imported.phase, source: "uri" };
    const guess = guessPhase(importedPlanName(imported), fileName);
    return guess ? { fileName, imported, phase: guess, source: "name" } : { fileName, imported };
  });
  const taken = new Set(known.flatMap((item) => ("phase" in item ? [item.phase] : [])));
  return known.map((item) => {
    if ("phase" in item) return item;
    const free = PHASES.find((p) => !taken.has(p)) ?? "post";
    taken.add(free);
    return { ...item, phase: free, source: "order" };
  });
}

export function PlanHeader({ plan, dispatch, issues, children }: PlanHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingImport[] | null>(null);
  const errorCount = issues.filter((i) => i.level === "error").length;

  const handleExport = () => {
    const bundle = buildBundle(plan);
    const baseName = plan.post.name || plan.pre.name || "plan";
    downloadJson(bundle, `${baseName} (bundle).json`);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  // Accepts a bundle, stored VELYS plan files (pre and/or post), or plain Laina plans.
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    // Reset so the same file can be re-imported
    e.target.value = "";

    const failures: string[] = [];
    const planFiles: { fileName: string; imported: PlanImport }[] = [];
    for (const file of files) {
      let data: unknown;
      try {
        data = JSON.parse(await readFile(file));
      } catch {
        failures.push(`${file.name}: failed to parse JSON.`);
        continue;
      }

      const imported = classifyImport(data);
      if (!imported) {
        failures.push(`${file.name}: not a bundle, plan file, or Laina plan.`);
        continue;
      }

      if (imported.kind === "bundle") {
        dispatch({ type: "IMPORT_SEQUENCE", plan: sequenceFromBundle(imported.bundle) });
        continue;
      }
      planFiles.push({ fileName: file.name, imported });
    }

    if (planFiles.length > 0) {
      const items = assignPhases(planFiles);
      const certain = items.every((i) => i.source === "uri");
      const distinct = new Set(items.map((i) => i.phase)).size === items.length;
      // Files whose URI already says pre or post import straight away; anything else is confirmed in the dialog.
      if (certain && distinct) applyImports(items);
      else setPending(items);
    }

    if (failures.length > 0) alert(failures.join("\n"));
  };

  const applyImports = (items: PendingImport[]) => {
    for (const { imported, phase } of items) {
      if (imported.kind === "stored") {
        dispatch({
          type: "IMPORT_PHASE",
          phase,
          plan: imported.file,
          meta: { name: imported.file.name || imported.file.planName, description: imported.file.description },
          assessments: imported.file.assessments,
        });
        if (imported.side) dispatch({ type: "SET_DEFAULT_SIDE", side: imported.side });
      } else {
        dispatch({ type: "IMPORT_PHASE", phase, plan: imported.plan });
      }
    }
  };

  const handleClear = () => {
    if (plan.activities.length === 0 && !plan.pre.name && !plan.post.name) return;
    if (confirm("Clear both plans, all activities, and assessment settings?")) {
      dispatch({ type: "CLEAR_PLAN" });
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
      <h1 className="text-sm font-semibold text-gray-800">Pre-op / Post-op Plan Builder</h1>
      <span className="flex-1 truncate text-xs text-gray-400">
        {[plan.pre.name, plan.post.name].filter(Boolean).join(" + ")}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleImport}
        className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
        title="Import a bundle, or select the pre-op and post-op files together (VELYS plan files or legacy Laina plans)"
      >
        Import
      </button>
      <button
        onClick={handleExport}
        disabled={errorCount > 0}
        className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
        title={errorCount > 0 ? `Fix ${errorCount} error${errorCount === 1 ? "" : "s"} before exporting` : "Download the pre + post bundle"}
      >
        Export Bundle
      </button>
      <button
        onClick={handleClear}
        className="rounded bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
      >
        Clear
      </button>
      {children}
      {pending && (
        <ImportDialog
          plan={plan}
          items={pending}
          onChangePhase={(index, phase) =>
            setPending((items) => items && items.map((item, i) => (i === index ? { ...item, phase } : item)))
          }
          onCancel={() => setPending(null)}
          onConfirm={() => {
            applyImports(pending);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}

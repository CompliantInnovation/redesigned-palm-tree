"use client";

import { useRef } from "react";
import { Plan, PlanAction } from "@/lib/types";
import { downloadJson } from "@/lib/utils";
import { Issue, buildBundle, classifyImport, sequenceFromBundle } from "@/lib/sequence";

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

export function PlanHeader({ plan, dispatch, issues, children }: PlanHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      const lainaPlan = imported.kind === "stored" ? imported.file : imported.plan;
      const phase =
        (imported.kind === "stored" && imported.phase) ||
        (confirm(`Import "${lainaPlan.planName}" (${file.name}) as the PRE-op plan?\n\nOK = pre-op, Cancel = post-op`)
          ? "pre"
          : "post");

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

    if (failures.length > 0) alert(failures.join("\n"));
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
        title="Import a bundle, stored plan files (select both pre and post), or a Laina plan"
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
    </div>
  );
}

"use client";

import { useRef } from "react";
import { Plan, PlanAction } from "@/lib/types";
import { exportPlan, downloadJson, validateImportedPlan } from "@/lib/utils";

interface PlanHeaderProps {
  plan: Plan;
  dispatch: React.Dispatch<PlanAction>;
}

export function PlanHeader({ plan, dispatch }: PlanHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const exported = exportPlan(plan);
    downloadJson(exported);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (validateImportedPlan(data)) {
          dispatch({ type: "IMPORT_PLAN", plan: data });
        } else {
          alert("Invalid plan file format.");
        }
      } catch {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);

    // Reset so the same file can be re-imported
    e.target.value = "";
  };

  const handleClear = () => {
    if (plan.activities.length === 0 && !plan.planName) return;
    if (confirm("Clear all activities and plan name?")) {
      dispatch({ type: "CLEAR_PLAN" });
    }
  };

  return (
    <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2">
      <label className="text-sm font-medium text-gray-600">Plan Name:</label>
      <input
        type="text"
        value={plan.planName}
        onChange={(e) => dispatch({ type: "SET_PLAN_NAME", name: e.target.value })}
        placeholder="Enter plan name…"
        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        onClick={handleImport}
        className="rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
      >
        Import
      </button>
      <button
        onClick={handleExport}
        className="rounded bg-blue-500 px-3 py-1 text-sm font-medium text-white hover:bg-blue-600"
      >
        Export
      </button>
      <button
        onClick={handleClear}
        className="rounded bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
      >
        Clear
      </button>
    </div>
  );
}

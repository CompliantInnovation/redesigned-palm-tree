"use client";

import { useState, useCallback } from "react";
import { usePlanState } from "@/hooks/usePlanState";
import {
  DEFAULT_PIXELS_PER_DAY,
  MIN_PIXELS_PER_DAY,
  MAX_PIXELS_PER_DAY,
  SIDEBAR_WIDTH,
} from "@/lib/constants";
import { PlanHeader } from "./PlanHeader";
import { ActivityCatalog } from "./ActivityCatalog";
import { GanttChart } from "./GanttChart";
import { JsonEditor, JsonEditorOrientation } from "./JsonEditor";

export function PlanEditor() {
  const { plan, dispatch } = usePlanState();
  const [pixelsPerDay, setPixelsPerDay] = useState(DEFAULT_PIXELS_PER_DAY);
  const [jsonOrientation, setJsonOrientation] = useState<JsonEditorOrientation>("vertical");

  const zoomIn = useCallback(() => {
    setPixelsPerDay((p) => Math.min(MAX_PIXELS_PER_DAY, p + 1));
  }, []);

  const zoomOut = useCallback(() => {
    setPixelsPerDay((p) => Math.max(MIN_PIXELS_PER_DAY, p - 1));
  }, []);

  const toggleOrientation = useCallback(() => {
    setJsonOrientation((o) => (o === "vertical" ? "horizontal" : "vertical"));
  }, []);

  const isHorizontal = jsonOrientation === "horizontal";

  return (
    <div className="flex h-full flex-col">
      <PlanHeader plan={plan} dispatch={dispatch}>
        <button
          onClick={toggleOrientation}
          className="rounded bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
          title={`JSON Editor: switch to ${isHorizontal ? "bottom" : "side"} panel`}
        >
          {isHorizontal ? (
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="14" height="14" rx="1" />
              <line x1="1" y1="10" x2="15" y2="10" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="1" width="14" height="14" rx="1" />
              <line x1="10" y1="1" x2="10" y2="15" />
            </svg>
          )}
        </button>
      </PlanHeader>
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-shrink-0" style={{ width: SIDEBAR_WIDTH }}>
          <ActivityCatalog />
        </div>
        <div className={`flex flex-1 overflow-hidden ${isHorizontal ? "flex-row" : "flex-col"}`}>
          <div className="flex-1 overflow-hidden">
            <GanttChart
              plan={plan}
              dispatch={dispatch}
              pixelsPerDay={pixelsPerDay}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
            />
          </div>
          <JsonEditor
            plan={plan}
            dispatch={dispatch}
            orientation={jsonOrientation}
            className={isHorizontal ? "h-full flex-shrink-0" : "flex-shrink-0"}
          />
        </div>
      </div>
    </div>
  );
}

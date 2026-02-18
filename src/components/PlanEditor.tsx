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

export function PlanEditor() {
  const { plan, dispatch } = usePlanState();
  const [pixelsPerDay, setPixelsPerDay] = useState(DEFAULT_PIXELS_PER_DAY);

  const zoomIn = useCallback(() => {
    setPixelsPerDay((p) => Math.min(MAX_PIXELS_PER_DAY, p + 1));
  }, []);

  const zoomOut = useCallback(() => {
    setPixelsPerDay((p) => Math.max(MIN_PIXELS_PER_DAY, p - 1));
  }, []);

  return (
    <div className="flex h-full flex-col">
      <PlanHeader plan={plan} dispatch={dispatch} />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-shrink-0" style={{ width: SIDEBAR_WIDTH }}>
          <ActivityCatalog />
        </div>
        <div className="flex-1 overflow-hidden">
          <GanttChart
            plan={plan}
            dispatch={dispatch}
            pixelsPerDay={pixelsPerDay}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
          />
        </div>
      </div>
    </div>
  );
}

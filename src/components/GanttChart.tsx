"use client";

import { useRef } from "react";
import { Plan, PlanAction } from "@/lib/types";
import { getActivityName } from "@/lib/utils";
import { ROW_HEIGHT, ROW_LABEL_WIDTH, TOTAL_DAYS } from "@/lib/constants";
import { useGanttInteraction } from "@/hooks/useGanttInteraction";
import { GanttTimeline } from "./GanttTimeline";
import { GanttDropZone } from "./GanttDropZone";
import { GanttRow } from "./GanttRow";

interface GanttChartProps {
  plan: Plan;
  dispatch: React.Dispatch<PlanAction>;
  pixelsPerDay: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function GanttChart({ plan, dispatch, pixelsPerDay, onZoomIn, onZoomOut }: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const { onPointerDown, onPointerMove, onPointerUp } = useGanttInteraction(pixelsPerDay, dispatch);

  const activities = plan.activities;
  const totalWidth = pixelsPerDay * TOTAL_DAYS;

  const handleScroll = () => {
    if (scrollRef.current && labelRef.current) {
      labelRef.current.scrollTop = scrollRef.current.scrollTop;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Zoom controls */}
      <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-1">
        <span className="text-xs text-gray-500">Zoom:</span>
        <button
          onClick={onZoomOut}
          className="rounded bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          −
        </button>
        <span className="text-xs text-gray-500">{pixelsPerDay}px/day</span>
        <button
          onClick={onZoomIn}
          className="rounded bg-gray-100 px-2 py-0.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          +
        </button>
        <span className="ml-2 text-xs text-gray-400">{activities.length} activities</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Row labels */}
        <div
          ref={labelRef}
          className="flex-shrink-0 overflow-hidden border-r border-gray-200 bg-white"
          style={{ width: ROW_LABEL_WIDTH }}
        >
          {/* Spacer for timeline */}
          <div className="border-b border-gray-300" style={{ height: 32 }} />
          <div>
            {activities.map((a, i) => (
              <div
                key={a._instanceId}
                className="flex items-center border-b border-gray-100 px-2 text-xs text-gray-700"
                style={{ height: ROW_HEIGHT }}
              >
                <span className="truncate">{getActivityName(a.id)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable chart area */}
        <div
          ref={scrollRef}
          className="gantt-scroll flex-1 overflow-auto"
          onScroll={handleScroll}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div style={{ width: totalWidth }}>
            <GanttTimeline pixelsPerDay={pixelsPerDay} />
            <GanttDropZone
              pixelsPerDay={pixelsPerDay}
              rowCount={activities.length}
              dispatch={dispatch}
            >
              {/* Grid lines */}
              {activities.map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 w-full border-b border-gray-100"
                  style={{ top: i * ROW_HEIGHT + ROW_HEIGHT, height: 0 }}
                />
              ))}
              {activities.map((a, i) => (
                <GanttRow
                  key={a._instanceId}
                  activity={a}
                  rowIndex={i}
                  pixelsPerDay={pixelsPerDay}
                  dispatch={dispatch}
                  onPointerDown={onPointerDown}
                />
              ))}
              {activities.length === 0 && (
                <div className="flex h-48 items-center justify-center text-sm text-gray-400">
                  Drag activities from the catalog to add them to the plan
                </div>
              )}
            </GanttDropZone>
          </div>
        </div>
      </div>
    </div>
  );
}

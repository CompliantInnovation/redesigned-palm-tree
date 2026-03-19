"use client";

import { useRef } from "react";
import { PlanActivity, PlanAction } from "@/lib/types";
import { dayToPixel, getActivityName, getActivityType } from "@/lib/utils";
import { ACTIVITY_COLORS, ROW_HEIGHT } from "@/lib/constants";

interface GanttRowProps {
  activity: PlanActivity;
  rowIndex: number;
  pixelsPerDay: number;
  dispatch: React.Dispatch<PlanAction>;
  onPointerDown: (
    e: React.PointerEvent,
    instanceId: string,
    mode: "move" | "resize",
    currentStart: number,
    currentLength: number
  ) => void;
  isSelected: boolean;
  onSelect: (instanceId: string | null) => void;
}

export function GanttRow({
  activity,
  rowIndex,
  pixelsPerDay,
  dispatch,
  onPointerDown,
  isSelected,
  onSelect,
}: GanttRowProps) {
  const left = dayToPixel(activity.performanceWindowStart, pixelsPerDay);
  const width = Math.max(dayToPixel(activity.performanceWindowLength, pixelsPerDay), 4);
  const activityType = getActivityType(activity.id);
  const colors = ACTIVITY_COLORS[activityType] || ACTIVITY_COLORS.UNKNOWN;
  const name = getActivityName(activity.id);
  const didDrag = useRef(false);

  return (
    <div
      className={`group absolute flex items-center rounded border ${colors.bg} ${colors.border} ${colors.text} cursor-grab select-none overflow-hidden text-[11px] font-medium shadow-sm active:cursor-grabbing ${
        isSelected ? "ring-2 ring-yellow-400 ring-offset-1" : ""
      }`}
      style={{
        left,
        width,
        top: rowIndex * ROW_HEIGHT + 4,
        height: ROW_HEIGHT - 8,
      }}
      onPointerDown={(e) => {
        didDrag.current = false;
        onPointerDown(
          e,
          activity._instanceId,
          "move",
          activity.performanceWindowStart,
          activity.performanceWindowLength
        );
      }}
      onPointerMove={() => { didDrag.current = true; }}
      onClick={() => {
        if (!didDrag.current) {
          onSelect(isSelected ? null : activity._instanceId);
        }
      }}
    >
      {activity.involvedSide && width > 20 && (
        <span className={`ml-1 flex-shrink-0 rounded px-0.5 text-[8px] font-bold leading-tight ${
          activity.involvedSide === "LEFT" ? "bg-purple-200/60" : "bg-orange-200/60"
        }`}>
          {activity.involvedSide === "LEFT" ? "L" : "R"}
        </span>
      )}
      <span className="truncate px-1">{width > 30 ? name : ""}</span>

      {/* Duplicate button */}
      <button
        className="absolute right-9 top-1/2 hidden h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-[10px] text-white hover:bg-black/40 group-hover:flex"
        title="Duplicate"
        onPointerDown={(e) => {
          e.stopPropagation();
          dispatch({ type: "DUPLICATE_ACTIVITY", instanceId: activity._instanceId });
        }}
      >
        <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 2a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V2zm2 8a2 2 0 00-2 2v2a2 2 0 002 2h6a2 2 0 002-2v-2a2 2 0 00-2-2h-1v1a3 3 0 01-3 3H5v-1H6a2 2 0 002-2v-1H6zM2 6a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V8a2 2 0 00-2-2H2z" />
        </svg>
      </button>

      {/* Delete button */}
      <button
        className="absolute right-5 top-1/2 hidden h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-[10px] text-white hover:bg-black/40 group-hover:flex"
        title="Remove"
        onPointerDown={(e) => {
          e.stopPropagation();
          dispatch({ type: "REMOVE_ACTIVITY", instanceId: activity._instanceId });
        }}
      >
        ×
      </button>

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize bg-black/10 opacity-0 group-hover:opacity-100"
        onPointerDown={(e) => {
          e.stopPropagation();
          onPointerDown(
            e,
            activity._instanceId,
            "resize",
            activity.performanceWindowStart,
            activity.performanceWindowLength
          );
        }}
      />
    </div>
  );
}

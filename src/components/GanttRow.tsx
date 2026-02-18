"use client";

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
}

export function GanttRow({
  activity,
  rowIndex,
  pixelsPerDay,
  dispatch,
  onPointerDown,
}: GanttRowProps) {
  const left = dayToPixel(activity.performanceWindowStart, pixelsPerDay);
  const width = Math.max(dayToPixel(activity.performanceWindowLength, pixelsPerDay), 4);
  const activityType = getActivityType(activity.id);
  const colors = ACTIVITY_COLORS[activityType] || ACTIVITY_COLORS.UNKNOWN;
  const name = getActivityName(activity.id);

  return (
    <div
      className={`group absolute flex items-center rounded border ${colors.bg} ${colors.border} ${colors.text} cursor-grab select-none overflow-hidden text-[11px] font-medium shadow-sm active:cursor-grabbing`}
      style={{
        left,
        width,
        top: rowIndex * ROW_HEIGHT + 4,
        height: ROW_HEIGHT - 8,
      }}
      onPointerDown={(e) =>
        onPointerDown(
          e,
          activity._instanceId,
          "move",
          activity.performanceWindowStart,
          activity.performanceWindowLength
        )
      }
    >
      <span className="truncate px-1.5">{width > 30 ? name : ""}</span>

      {/* Delete button */}
      <button
        className="absolute right-5 top-1/2 hidden h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full bg-black/20 text-[10px] text-white hover:bg-black/40 group-hover:flex"
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

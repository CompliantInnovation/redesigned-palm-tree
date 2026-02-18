"use client";

import { DragEvent, useState } from "react";
import { PlanAction } from "@/lib/types";
import { pixelToDay } from "@/lib/utils";
import { TOTAL_DAYS, ROW_HEIGHT } from "@/lib/constants";

interface GanttDropZoneProps {
  pixelsPerDay: number;
  rowCount: number;
  dispatch: React.Dispatch<PlanAction>;
  children: React.ReactNode;
}

export function GanttDropZone({ pixelsPerDay, rowCount, dispatch, children }: GanttDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const totalWidth = pixelsPerDay * TOTAL_DAYS;
  const minHeight = Math.max(rowCount * ROW_HEIGHT, 200);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const activityId = e.dataTransfer.getData("application/activity-id");
    if (!activityId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
    const day = pixelToDay(x, pixelsPerDay);

    dispatch({ type: "ADD_ACTIVITY", id: activityId, performanceWindowStart: day });
  };

  return (
    <div
      className={`relative ${isDragOver ? "bg-blue-50/50" : ""}`}
      style={{ width: totalWidth, minHeight }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 rounded border-2 border-dashed border-blue-300" />
      )}
    </div>
  );
}

"use client";

import { useRef, useCallback, useState, DragEvent } from "react";
import { Plan, PlanAction } from "@/lib/types";
import { getActivityName } from "@/lib/utils";
import { ROW_HEIGHT, ROW_LABEL_WIDTH, TIMELINE_HEIGHT, TOTAL_DAYS } from "@/lib/constants";
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
  selectedInstanceId: string | null;
  onSelectActivity: (instanceId: string | null) => void;
}

export function GanttChart({ plan, dispatch, pixelsPerDay, onZoomIn, onZoomOut, selectedInstanceId, onSelectActivity }: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const { onPointerDown, onPointerMove, onPointerUp } = useGanttInteraction(pixelsPerDay, dispatch);

  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  const activities = plan.activities;
  const totalWidth = pixelsPerDay * TOTAL_DAYS;

  const handleLabelDragStart = (e: DragEvent, index: number) => {
    setDragFrom(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleLabelDragOver = (e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(index);
  };

  const handleLabelDrop = (e: DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragFrom !== null && dragFrom !== toIndex) {
      dispatch({ type: "REORDER_ACTIVITY", fromIndex: dragFrom, toIndex });
    }
    setDragFrom(null);
    setDragOver(null);
  };

  const handleLabelDragEnd = () => {
    setDragFrom(null);
    setDragOver(null);
  };

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollLeft } = scrollRef.current;
    if (labelRef.current) labelRef.current.scrollTop = scrollTop;
    if (timelineRef.current) timelineRef.current.scrollLeft = scrollLeft;
  }, []);

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

      {/* Fixed timeline header row */}
      <div className="flex border-b border-gray-300">
        {/* Corner cell above row labels */}
        <div
          className="flex-shrink-0 border-r border-gray-200 bg-gray-50"
          style={{ width: ROW_LABEL_WIDTH, height: TIMELINE_HEIGHT }}
        />
        {/* Horizontally-scrollable timeline (synced with body) */}
        <div
          ref={timelineRef}
          className="flex-1 overflow-hidden"
        >
          <GanttTimeline pixelsPerDay={pixelsPerDay} />
        </div>
      </div>

      {/* Body: labels + chart rows */}
      <div className="flex flex-1 overflow-hidden">
        {/* Row labels */}
        <div
          ref={labelRef}
          className="flex-shrink-0 overflow-hidden border-r border-gray-200 bg-white"
          style={{ width: ROW_LABEL_WIDTH }}
        >
          <div>
            {activities.map((a, i) => (
              <div
                key={a._instanceId}
                draggable
                onDragStart={(e) => handleLabelDragStart(e, i)}
                onDragOver={(e) => handleLabelDragOver(e, i)}
                onDrop={(e) => handleLabelDrop(e, i)}
                onDragEnd={handleLabelDragEnd}
                className={`flex cursor-grab items-center border-b px-2 text-xs text-gray-700 active:cursor-grabbing ${
                  i % 2 === 1 ? "bg-gray-50" : "bg-white"
                } ${
                  dragOver === i && dragFrom !== null && dragFrom !== i
                    ? "border-t-2 border-t-blue-500 border-b-gray-100"
                    : "border-b-gray-100"
                } ${dragFrom === i ? "opacity-40" : ""}`}
                style={{ height: ROW_HEIGHT }}
              >
                <svg className="mr-1.5 h-3.5 w-3.5 flex-shrink-0 text-gray-300" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="5" cy="3" r="1.2" /><circle cx="11" cy="3" r="1.2" />
                  <circle cx="5" cy="8" r="1.2" /><circle cx="11" cy="8" r="1.2" />
                  <circle cx="5" cy="13" r="1.2" /><circle cx="11" cy="13" r="1.2" />
                </svg>
                <span className="truncate">{getActivityName(a.id)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable chart area (vertical + horizontal) */}
        <div
          ref={scrollRef}
          className="gantt-scroll flex-1 overflow-auto"
          onScroll={handleScroll}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div style={{ width: totalWidth }}>
            <GanttDropZone
              pixelsPerDay={pixelsPerDay}
              rowCount={activities.length}
              dispatch={dispatch}
            >
              {/* Row stripes */}
              {activities.map((_, i) => (
                <div
                  key={i}
                  className={`absolute left-0 w-full border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50" : ""}`}
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
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
                  isSelected={a._instanceId === selectedInstanceId}
                  onSelect={onSelectActivity}
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

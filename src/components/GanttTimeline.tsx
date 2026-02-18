"use client";

import { TOTAL_DAYS, DAY_MARKER_INTERVAL, TIMELINE_HEIGHT } from "@/lib/constants";
import { dayToPixel } from "@/lib/utils";

interface GanttTimelineProps {
  pixelsPerDay: number;
}

export function GanttTimeline({ pixelsPerDay }: GanttTimelineProps) {
  const totalWidth = dayToPixel(TOTAL_DAYS, pixelsPerDay);
  const markers: number[] = [];
  for (let d = 0; d <= TOTAL_DAYS; d += DAY_MARKER_INTERVAL) {
    markers.push(d);
  }

  return (
    <div
      className="relative border-b border-gray-300 bg-gray-50"
      style={{ width: totalWidth, height: TIMELINE_HEIGHT }}
    >
      {markers.map((day) => (
        <div
          key={day}
          className="absolute top-0 flex flex-col items-start"
          style={{ left: dayToPixel(day, pixelsPerDay), height: TIMELINE_HEIGHT }}
        >
          <div className="h-full w-px bg-gray-300" />
          <span className="absolute bottom-1 left-1 text-[10px] text-gray-500 select-none">
            {day}
          </span>
        </div>
      ))}
    </div>
  );
}

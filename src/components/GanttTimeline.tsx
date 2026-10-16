"use client";

import { TOTAL_DAYS, DAY_MARKER_INTERVAL, TIMELINE_HEIGHT } from "@/lib/constants";
import { dayToPixel } from "@/lib/utils";

interface GanttTimelineProps {
  pixelsPerDay: number;
  originDay: number;
}

export function GanttTimeline({ pixelsPerDay, originDay }: GanttTimelineProps) {
  const totalWidth = dayToPixel(TOTAL_DAYS, pixelsPerDay, originDay);
  const markers: number[] = [];
  const firstMarker = Math.ceil(originDay / DAY_MARKER_INTERVAL) * DAY_MARKER_INTERVAL;
  for (let d = firstMarker; d <= TOTAL_DAYS; d += DAY_MARKER_INTERVAL) {
    markers.push(d);
  }

  return (
    <div
      className="relative border-b border-gray-300 bg-gray-50"
      style={{ width: totalWidth, height: TIMELINE_HEIGHT }}
    >
      {originDay < 0 && (
        <div
          className="absolute inset-y-0 left-0 bg-amber-100/70"
          style={{ width: dayToPixel(0, pixelsPerDay, originDay) }}
        >
          <span className="absolute left-1 top-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700 select-none">
            Pre-op
          </span>
        </div>
      )}
      {markers.map((day) => (
        <div
          key={day}
          className="absolute top-0 flex flex-col items-start"
          style={{ left: dayToPixel(day, pixelsPerDay, originDay), height: TIMELINE_HEIGHT }}
        >
          <div className={day === 0 ? "h-full w-0.5 bg-rose-500" : "h-full w-px bg-gray-300"} />
          <span
            className={`absolute bottom-1 left-1 text-[10px] select-none ${
              day === 0 ? "font-semibold text-rose-600" : "text-gray-500"
            }`}
          >
            {day}
          </span>
          {day === 0 && (
            <span className="absolute left-1 top-0.5 text-[9px] font-semibold uppercase tracking-wide text-rose-600 select-none">
              Surgery
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

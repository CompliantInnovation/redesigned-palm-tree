"use client";

import { CatalogActivity } from "@/lib/types";
import { useDragActivity } from "@/hooks/useDragActivity";
import { ACTIVITY_COLORS } from "@/lib/constants";

interface ActivityCatalogItemProps {
  activity: CatalogActivity;
}

export function ActivityCatalogItem({ activity }: ActivityCatalogItemProps) {
  const { onDragStart, draggable } = useDragActivity(activity.id);
  const colors = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.UNKNOWN;

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      className="flex cursor-grab items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1.5 text-sm hover:border-gray-300 hover:shadow-sm active:cursor-grabbing"
    >
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${colors.bg}`}
      />
      <span className="truncate">{activity.name}</span>
    </div>
  );
}

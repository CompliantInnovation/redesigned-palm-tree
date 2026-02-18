import { DragEvent } from "react";

export function useDragActivity(activityId: string) {
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("application/activity-id", activityId);
    e.dataTransfer.effectAllowed = "copy";
  };

  return { onDragStart, draggable: true };
}

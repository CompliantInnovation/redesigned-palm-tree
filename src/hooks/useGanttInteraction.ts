import { useRef, useCallback } from "react";
import { PlanAction } from "@/lib/types";
import { pixelToDay } from "@/lib/utils";
import { MIN_WINDOW_LENGTH } from "@/lib/constants";

type InteractionMode = "move" | "resize" | null;

interface DragState {
  mode: InteractionMode;
  instanceId: string;
  startX: number;
  originalStart: number;
  originalLength: number;
}

export function useGanttInteraction(
  pixelsPerDay: number,
  dispatch: React.Dispatch<PlanAction>
) {
  const dragState = useRef<DragState | null>(null);

  const onPointerDown = useCallback(
    (
      e: React.PointerEvent,
      instanceId: string,
      mode: "move" | "resize",
      currentStart: number,
      currentLength: number
    ) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragState.current = {
        mode,
        instanceId,
        startX: e.clientX,
        originalStart: currentStart,
        originalLength: currentLength,
      };
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const state = dragState.current;
      if (!state) return;

      const dx = e.clientX - state.startX;
      const dayDelta = Math.round(dx / pixelsPerDay);

      if (state.mode === "move") {
        const newStart = Math.max(0, state.originalStart + dayDelta);
        dispatch({
          type: "MOVE_ACTIVITY",
          instanceId: state.instanceId,
          performanceWindowStart: newStart,
        });
      } else if (state.mode === "resize") {
        const newLength = Math.max(MIN_WINDOW_LENGTH, state.originalLength + dayDelta);
        dispatch({
          type: "RESIZE_ACTIVITY",
          instanceId: state.instanceId,
          performanceWindowLength: newLength,
        });
      }
    },
    [pixelsPerDay, dispatch]
  );

  const onPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp };
}

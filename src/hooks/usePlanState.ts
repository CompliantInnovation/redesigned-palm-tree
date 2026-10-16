import { useReducer } from "react";
import { Plan, PlanAction } from "@/lib/types";
import { DEFAULT_PERFORMANCE_WINDOW_LENGTH } from "@/lib/constants";
import { generateInstanceId } from "@/lib/utils";
import { clampPreOpDays, createEmptyPlan, importPhase, windowKey } from "@/lib/sequence";

function planReducer(state: Plan, action: PlanAction): Plan {
  switch (action.type) {
    case "SET_PLAN_META":
      return { ...state, [action.phase]: { ...state[action.phase], [action.field]: action.value } };

    case "SET_PRE_OP_DAYS":
      return { ...state, preOpDays: clampPreOpDays(action.days) };

    case "SET_DEFAULT_SIDE":
      return { ...state, defaultSide: action.side };

    case "SET_ASSESSMENT_META":
      return {
        ...state,
        assessments: {
          ...state.assessments,
          [action.key]: { ...state.assessments[action.key], ...action.patch },
        },
      };

    case "SET_ASSESSMENT_WINDOW": {
      // Moves every activity in the assessment and carries its metadata to the new window.
      const [oldStart] = action.key.split(":").map(Number);
      const newKey = windowKey(action.start, action.length);
      if (newKey === action.key) return state;
      const activities = state.activities.map((a) =>
        windowKey(a.performanceWindowStart, a.performanceWindowLength) === action.key
          ? { ...a, performanceWindowStart: action.start, performanceWindowLength: action.length }
          : a
      );
      const { [action.key]: moved, ...assessments } = state.assessments;
      if (moved && !assessments[newKey]) {
        assessments[newKey] = {
          ...moved,
          dueDay: moved.dueDay === undefined ? undefined : moved.dueDay + action.start - oldStart,
        };
      }
      return { ...state, activities, assessments };
    }

    case "ADD_ACTIVITY": {
      const start = action.performanceWindowStart;
      // Activities dropped before surgery shouldn't spill past day 0.
      const length = start < 0 ? Math.min(DEFAULT_PERFORMANCE_WINDOW_LENGTH, -start) : DEFAULT_PERFORMANCE_WINDOW_LENGTH;
      return {
        ...state,
        activities: [
          ...state.activities,
          {
            id: action.id,
            performanceWindowStart: start,
            performanceWindowLength: length,
            _instanceId: generateInstanceId(),
          },
        ],
      };
    }

    case "REMOVE_ACTIVITY":
      return {
        ...state,
        activities: state.activities.filter((a) => a._instanceId !== action.instanceId),
      };

    case "MOVE_ACTIVITY":
      return {
        ...state,
        activities: state.activities.map((a) =>
          a._instanceId === action.instanceId
            ? { ...a, performanceWindowStart: action.performanceWindowStart }
            : a
        ),
      };

    case "RESIZE_ACTIVITY":
      return {
        ...state,
        activities: state.activities.map((a) =>
          a._instanceId === action.instanceId
            ? { ...a, performanceWindowLength: action.performanceWindowLength }
            : a
        ),
      };

    case "SET_INVOLVED_SIDE":
      return {
        ...state,
        activities: state.activities.map((a) =>
          a._instanceId === action.instanceId
            ? { ...a, involvedSide: action.involvedSide }
            : a
        ),
      };

    case "DUPLICATE_ACTIVITY": {
      const idx = state.activities.findIndex((a) => a._instanceId === action.instanceId);
      if (idx === -1) return state;
      const source = state.activities[idx];
      const copy = { ...source, _instanceId: generateInstanceId() };
      const activities = [...state.activities];
      activities.splice(idx + 1, 0, copy);
      return { ...state, activities };
    }

    case "REORDER_ACTIVITY": {
      const activities = [...state.activities];
      const [moved] = activities.splice(action.fromIndex, 1);
      activities.splice(action.toIndex, 0, moved);
      return { ...state, activities };
    }

    case "IMPORT_PHASE":
      return importPhase(state, action.phase, action.plan, action.meta, action.assessments);

    case "IMPORT_SEQUENCE":
      return action.plan;

    case "CLEAR_PLAN":
      return createEmptyPlan();

    default:
      return state;
  }
}

export function usePlanState() {
  const [plan, dispatch] = useReducer(planReducer, undefined, createEmptyPlan);
  return { plan, dispatch };
}

import { useReducer } from "react";
import { Plan, PlanAction } from "@/lib/types";
import { DEFAULT_PERFORMANCE_WINDOW_LENGTH } from "@/lib/constants";
import { generateInstanceId, importPlan } from "@/lib/utils";

const initialState: Plan = {
  planName: "",
  activities: [],
};

function planReducer(state: Plan, action: PlanAction): Plan {
  switch (action.type) {
    case "SET_PLAN_NAME":
      return { ...state, planName: action.name };

    case "ADD_ACTIVITY":
      return {
        ...state,
        activities: [
          ...state.activities,
          {
            id: action.id,
            performanceWindowStart: action.performanceWindowStart,
            performanceWindowLength: DEFAULT_PERFORMANCE_WINDOW_LENGTH,
            _instanceId: generateInstanceId(),
          },
        ],
      };

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

    case "REORDER_ACTIVITY": {
      const activities = [...state.activities];
      const [moved] = activities.splice(action.fromIndex, 1);
      activities.splice(action.toIndex, 0, moved);
      return { ...state, activities };
    }

    case "IMPORT_PLAN":
      return importPlan(action.plan);

    case "CLEAR_PLAN":
      return { ...initialState };

    default:
      return state;
  }
}

export function usePlanState() {
  const [plan, dispatch] = useReducer(planReducer, initialState);
  return { plan, dispatch };
}

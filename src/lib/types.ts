export type ActivityType = "SURVEY" | "FUNCTIONAL_TEST";

export interface CatalogActivity {
  id: string;
  name: string;
  type: ActivityType;
}

export interface PlanActivity {
  id: string;
  performanceWindowStart: number;
  performanceWindowLength: number;
  _instanceId: string;
}

export interface Plan {
  planName: string;
  activities: PlanActivity[];
}

export interface ExportedPlan {
  planName: string;
  activities: {
    id: string;
    performanceWindowStart: number;
    performanceWindowLength: number;
  }[];
}

export type PlanAction =
  | { type: "SET_PLAN_NAME"; name: string }
  | { type: "ADD_ACTIVITY"; id: string; performanceWindowStart: number }
  | { type: "REMOVE_ACTIVITY"; instanceId: string }
  | { type: "MOVE_ACTIVITY"; instanceId: string; performanceWindowStart: number }
  | { type: "RESIZE_ACTIVITY"; instanceId: string; performanceWindowLength: number }
  | { type: "IMPORT_PLAN"; plan: ExportedPlan }
  | { type: "CLEAR_PLAN" };

import { ExportedPlan, Plan, PlanActivity } from "./types";
import { catalogActivities } from "@/data/activities";

let instanceCounter = 0;

export function generateInstanceId(): string {
  return `inst_${Date.now()}_${++instanceCounter}`;
}

export function dayToPixel(day: number, pixelsPerDay: number): number {
  return day * pixelsPerDay;
}

export function pixelToDay(pixel: number, pixelsPerDay: number): number {
  return Math.max(0, Math.round(pixel / pixelsPerDay));
}

export function getCatalogActivity(id: string) {
  return catalogActivities.find((a) => a.id === id);
}

export function getActivityName(id: string): string {
  const activity = getCatalogActivity(id);
  return activity ? activity.name : "Unknown Activity";
}

export function getActivityType(id: string): string {
  const activity = getCatalogActivity(id);
  return activity ? activity.type : "UNKNOWN";
}

export function exportPlan(plan: Plan): ExportedPlan {
  return {
    planName: plan.planName,
    activities: plan.activities.map(({ id, performanceWindowStart, performanceWindowLength, involvedSide }) => {
      const activity: ExportedPlan["activities"][number] = {
        id,
        performanceWindowStart,
        performanceWindowLength,
      };
      if (involvedSide) {
        activity.involvedSide = involvedSide;
      }
      return activity;
    }),
  };
}

export function importPlan(data: ExportedPlan): Plan {
  return {
    planName: data.planName,
    activities: data.activities.map((a) => ({
      ...a,
      _instanceId: generateInstanceId(),
    })),
  };
}

export function validateImportedPlan(data: unknown): data is ExportedPlan {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.planName !== "string") return false;
  if (!Array.isArray(obj.activities)) return false;
  return obj.activities.every((a: unknown) => {
    if (typeof a !== "object" || a === null) return false;
    const act = a as Record<string, unknown>;
    if (typeof act.id !== "string") return false;
    if (typeof act.performanceWindowStart !== "number") return false;
    if (typeof act.performanceWindowLength !== "number") return false;
    if (act.involvedSide !== undefined && act.involvedSide !== "LEFT" && act.involvedSide !== "RIGHT") return false;
    return true;
  });
}

export function downloadJson(data: ExportedPlan) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.planName || "plan"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

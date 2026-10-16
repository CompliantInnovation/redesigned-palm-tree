import { ExportedPlan } from "./types";
import { catalogActivities } from "@/data/activities";

let instanceCounter = 0;

export function generateInstanceId(): string {
  return `inst_${Date.now()}_${++instanceCounter}`;
}

/** `originDay` is the day drawn at pixel 0 (negative when pre-op days are shown). */
export function dayToPixel(day: number, pixelsPerDay: number, originDay = 0): number {
  return (day - originDay) * pixelsPerDay;
}

export function pixelToDay(pixel: number, pixelsPerDay: number, originDay = 0): number {
  return Math.max(originDay, Math.round(pixel / pixelsPerDay) + originDay);
}

// Catalog IDs are dashed UUIDs while Laina plans use 32-char hex, so compare without dashes.
function normalizeId(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

const catalogById = new Map(catalogActivities.map((a) => [normalizeId(a.id), a]));

export function getCatalogActivity(id: string) {
  return catalogById.get(normalizeId(id));
}

export function getActivityName(id: string): string {
  const activity = getCatalogActivity(id);
  return activity ? activity.name : "Unknown Activity";
}

export function getActivityType(id: string): string {
  const activity = getCatalogActivity(id);
  return activity ? activity.type : "UNKNOWN";
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

export function downloadJson(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const DEFAULT_PIXELS_PER_DAY = 3;
export const MIN_PIXELS_PER_DAY = 1;
export const MAX_PIXELS_PER_DAY = 8;
export const DEFAULT_PERFORMANCE_WINDOW_LENGTH = 10;
export const TOTAL_DAYS = 400;
export const DAY_MARKER_INTERVAL = 10;
export const SIDEBAR_WIDTH = 280;
export const ROW_HEIGHT = 40;
export const TIMELINE_HEIGHT = 32;
export const ROW_LABEL_WIDTH = 200;
export const MIN_WINDOW_LENGTH = 1;

export const ACTIVITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  SURVEY: {
    bg: "bg-blue-500",
    border: "border-blue-600",
    text: "text-white",
  },
  FUNCTIONAL_TEST: {
    bg: "bg-emerald-500",
    border: "border-emerald-600",
    text: "text-white",
  },
  UNKNOWN: {
    bg: "bg-gray-400",
    border: "border-gray-500",
    text: "text-white",
  },
};

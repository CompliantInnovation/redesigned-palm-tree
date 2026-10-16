"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Plan, PlanAction, ExportedPlan, Phase } from "@/lib/types";
import { validateImportedPlan, getActivityName } from "@/lib/utils";
import { PHASE_LABELS, buildBundle, exportLainaPlan, phaseActivities, phaseOf } from "@/lib/sequence";

type ValidationState = "valid" | "invalid-json" | "invalid-schema" | "invalid-range" | "synced";
type Tab = Phase | "bundle";

const TABS: { value: Tab; label: string }[] = [
  { value: "pre", label: `${PHASE_LABELS.pre} (Laina)` },
  { value: "post", label: `${PHASE_LABELS.post} (Laina)` },
  { value: "bundle", label: "Bundle" },
];
type Theme = "dark" | "light";

export type JsonEditorOrientation = "vertical" | "horizontal";

interface JsonEditorProps {
  plan: Plan;
  dispatch: React.Dispatch<PlanAction>;
  orientation: JsonEditorOrientation;
  selectedInstanceId?: string | null;
  className?: string;
}

function serializePlan(plan: Plan, tab: Tab): string {
  const data = tab === "bundle" ? buildBundle(plan) : exportLainaPlan(plan, tab);
  const json = JSON.stringify(data, null, 2);
  return json.replace(/"id": "([^"]+)"(,?)/g, (_, id: string, comma: string) => {
    const name = getActivityName(id);
    return `"id": "${id}"${comma} // ${name}`;
  });
}

/** Index of a `//` comment on the line, ignoring `//` inside strings (e.g. URIs); -1 if none. */
function findCommentStart(line: string): number {
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === '"') inString = false;
    } else if (ch === '"') {
      inString = true;
    } else if (ch === "/" && line[i + 1] === "/") {
      return i;
    }
  }
  return -1;
}

function stripComments(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const at = findCommentStart(line);
      return at === -1 ? line : line.slice(0, at).trimEnd();
    })
    .join("\n");
}

function validate(text: string, phase: Phase, preOpDays: number): { state: ValidationState; parsed?: ExportedPlan } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripComments(text));
  } catch {
    return { state: "invalid-json" };
  }
  if (!validateImportedPlan(parsed)) {
    return { state: "invalid-schema" };
  }
  // Laina days can't be negative, and pre-op windows must end by surgery (Laina day preOpDays).
  const outOfRange = parsed.activities.some(
    (a) =>
      a.performanceWindowStart < 0 ||
      a.performanceWindowLength < 1 ||
      (phase === "pre" && a.performanceWindowStart + a.performanceWindowLength > preOpDays)
  );
  if (outOfRange) {
    return { state: "invalid-range" };
  }
  return { state: "valid", parsed };
}

// --- Syntax highlighting ---

const themes = {
  dark: {
    bg: "bg-gray-950",
    text: "text-gray-100",
    caret: "caret-gray-100",
    key: "#9cdcfe",
    string: "#ce9178",
    number: "#b5cea8",
    boolean: "#569cd6",
    null: "#569cd6",
    brace: "#d4d4d4",
    comment: "#6a9955",
    errorRing: "ring-red-500/30",
  },
  light: {
    bg: "bg-white",
    text: "text-gray-900",
    caret: "caret-gray-900",
    key: "#0451a5",
    string: "#a31515",
    number: "#098658",
    boolean: "#0000ff",
    null: "#0000ff",
    brace: "#333333",
    comment: "#008000",
    errorRing: "ring-red-400/40",
  },
};

type Token =
  | { type: "key"; value: string }
  | { type: "string"; value: string }
  | { type: "number"; value: string }
  | { type: "boolean"; value: string }
  | { type: "null"; value: string }
  | { type: "brace"; value: string }
  | { type: "comment"; value: string }
  | { type: "plain"; value: string };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  // Process line-by-line to handle comments
  const lines = text.split("\n");
  for (let li = 0; li < lines.length; li++) {
    if (li > 0) tokens.push({ type: "plain", value: "\n" });
    let line = lines[li];

    // Extract trailing comment
    let commentPart = "";
    const commentAt = findCommentStart(line);
    if (commentAt !== -1) {
      commentPart = line.slice(commentAt);
      line = line.slice(0, commentAt);
    }

    // Tokenize the JSON part
    const re = /("(?:[^"\\]|\\.)*")\s*(:?)|([-+]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b)|(\bnull\b)|([[\]{}:,])|(\s+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line)) !== null) {
      if (m[1] !== undefined) {
        // String — check if it's a key (followed by colon)
        if (m[2]) {
          tokens.push({ type: "key", value: m[1] });
          tokens.push({ type: "brace", value: ":" });
        } else {
          tokens.push({ type: "string", value: m[1] });
        }
      } else if (m[3] !== undefined) {
        tokens.push({ type: "number", value: m[3] });
      } else if (m[4] !== undefined) {
        tokens.push({ type: "boolean", value: m[4] });
      } else if (m[5] !== undefined) {
        tokens.push({ type: "null", value: m[5] });
      } else if (m[6] !== undefined) {
        tokens.push({ type: "brace", value: m[6] });
      } else if (m[7] !== undefined) {
        tokens.push({ type: "plain", value: m[7] });
      }
    }

    if (commentPart) {
      tokens.push({ type: "comment", value: commentPart });
    }
  }
  return tokens;
}

function HighlightedCode({ text, theme }: { text: string; theme: Theme }) {
  const colors = themes[theme];
  const tokens = useMemo(() => tokenize(text), [text]);

  return (
    <>
      {tokens.map((tok, i) => {
        const color = tok.type === "plain" ? undefined : colors[tok.type];
        return color ? (
          <span key={i} style={{ color }}>
            {tok.value}
          </span>
        ) : (
          <span key={i}>{tok.value}</span>
        );
      })}
      {/* Trailing newline so pre/textarea heights match */}
      {"\n"}
    </>
  );
}

// --- Theme toggle icon ---

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="rounded p-0.5 text-gray-400 hover:text-gray-600"
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 018 1zm0 11a.5.5 0 01.5.5v1a.5.5 0 01-1 0v-1A.5.5 0 018 12zm7-4a.5.5 0 010 1h-1a.5.5 0 010-1h1zM3 8a.5.5 0 010 1H2a.5.5 0 010-1h1zm9.354-3.354a.5.5 0 010 .708l-.708.707a.5.5 0 11-.707-.707l.707-.708a.5.5 0 01.708 0zM5.061 10.939a.5.5 0 010 .707l-.708.708a.5.5 0 11-.707-.708l.708-.707a.5.5 0 01.707 0zM12.354 11.354a.5.5 0 00-.708 0l-.707-.708a.5.5 0 11.707-.707l.708.707a.5.5 0 010 .708zM5.061 5.061a.5.5 0 00.707 0l-.707-.708a.5.5 0 00-.708.708l.708.707zM8 4a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 .278a.768.768 0 01.08.858 7.208 7.208 0 00-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 01.81.316.733.733 0 01-.031.893A8.349 8.349 0 018.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 016 .278z" />
        </svg>
      )}
    </button>
  );
}

// --- Editor area (shared between both layouts) ---

function EditorArea({
  text,
  theme,
  status,
  onChange,
  highlightRange,
  focusKey,
  readOnly,
}: {
  text: string;
  theme: Theme;
  status: ValidationState;
  onChange: (value: string) => void;
  highlightRange: { start: number; end: number } | null;
  /** Changes when the selected activity changes; only then does the editor take focus. */
  focusKey: string | null;
  readOnly: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Jump to the selection once per new selection. Later text changes (e.g. typing a
  // plan name elsewhere) must not pull focus back into the editor.
  const pendingFocus = useRef(false);
  useEffect(() => {
    pendingFocus.current = focusKey !== null;
  }, [focusKey]);

  // Highlight and scroll to selection range
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta || !highlightRange || !pendingFocus.current) return;
    pendingFocus.current = false;
    ta.focus();
    ta.setSelectionRange(highlightRange.start, highlightRange.end);

    // Scroll textarea so the selection is visible.
    // Calculate approximate line of the start position.
    const textBefore = text.slice(0, highlightRange.start);
    const lineNumber = textBefore.split("\n").length - 1;
    // Approximate line height from computed style
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 18;
    const scrollTarget = lineNumber * lineHeight - ta.clientHeight / 3;
    ta.scrollTop = Math.max(0, scrollTarget);
    // Sync the pre underlay
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
    }
  }, [highlightRange, text]);

  const colors = themes[theme];
  const hasError = status === "invalid-json" || status === "invalid-schema" || status === "invalid-range";

  return (
    <div className={`relative h-full w-full overflow-hidden ${colors.bg} ${hasError ? `ring-2 ring-inset ${colors.errorRing}` : ""}`}>
      {/* Highlighted underlay */}
      <pre
        ref={preRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden whitespace-pre p-3 font-mono text-xs leading-relaxed ${colors.text}`}
      >
        <code>
          <HighlightedCode text={text} theme={theme} />
        </code>
      </pre>
      {/* Transparent textarea on top for editing */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        readOnly={readOnly}
        spellCheck={false}
        className={`relative h-full w-full resize-none border-0 bg-transparent p-3 font-mono text-xs leading-relaxed text-transparent ${colors.caret} focus:outline-none`}
        style={{ caretColor: theme === "dark" ? "#e5e7eb" : "#111827" }}
      />
    </div>
  );
}

// --- Main component ---

const DEFAULT_SIZE = 300;
const MIN_SIZE = 80;
const MAX_SIZE = 800;

function findActivityBlockRange(text: string, activityId: string, occurrence: number): { start: number; end: number } | null {
  // Find the nth occurrence of this activity ID in the text
  const idNeedle = `"id": "${activityId}"`;
  let idPos = -1;
  let searchFrom = 0;
  for (let n = 0; n <= occurrence; n++) {
    idPos = text.indexOf(idNeedle, searchFrom);
    if (idPos === -1) return null;
    searchFrom = idPos + 1;
  }

  // Search backwards from idPos for the opening `{`
  let start = -1;
  for (let i = idPos - 1; i >= 0; i--) {
    if (text[i] === "{") {
      start = i;
      break;
    }
  }
  if (start === -1) return null;

  // Search forwards from the opening `{` for the matching `}`
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) {
        return { start, end: i + 1 };
      }
    }
  }
  return null;
}

export function JsonEditor({ plan, dispatch, orientation, selectedInstanceId, className = "" }: JsonEditorProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [theme, setTheme] = useState<Theme>("dark");
  const [tab, setTab] = useState<Tab>("post");
  const [text, setText] = useState(() => serializePlan(plan, "post"));
  const [status, setStatus] = useState<ValidationState>("synced");
  const isLocalEdit = useRef(false);
  const resizeState = useRef<{ startPos: number; startSize: number } | null>(null);

  const isHorizontal = orientation === "horizontal";

  // Compute highlight range from selection (within the selected activity's phase plan)
  const selectedActivity = selectedInstanceId
    ? plan.activities.find((a) => a._instanceId === selectedInstanceId)
    : null;
  const selectedPhase = selectedActivity ? phaseOf(selectedActivity.performanceWindowStart) : null;
  const phaseList = selectedPhase ? phaseActivities(plan, selectedPhase) : [];
  // Count how many prior activities share the same ID (for duplicate IDs in a plan)
  const occurrence = selectedActivity
    ? phaseList
        .slice(0, phaseList.indexOf(selectedActivity))
        .filter((a) => a.id === selectedActivity.id).length
    : 0;
  const highlightRange =
    selectedActivity && tab === selectedPhase ? findActivityBlockRange(text, selectedActivity.id, occurrence) : null;

  // Auto-expand and switch to the activity's plan when an activity is selected
  useEffect(() => {
    if (!selectedPhase) return;
    if (collapsed) setCollapsed(false);
    if (tab !== selectedPhase) setTab(selectedPhase);
  }, [selectedInstanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isLocalEdit.current) {
      isLocalEdit.current = false;
      return;
    }
    setText(serializePlan(plan, tab));
    setStatus("synced");
  }, [plan, tab]);

  const handleChange = useCallback(
    (value: string) => {
      if (tab === "bundle") return;
      setText(value);
      const result = validate(value, tab, plan.preOpDays);
      setStatus(result.state);
      if (result.state === "valid" && result.parsed) {
        isLocalEdit.current = true;
        dispatch({ type: "IMPORT_PHASE", phase: tab, plan: result.parsed });
        setStatus("synced");
      }
    },
    [dispatch, tab, plan.preOpDays]
  );

  const tabBar = (
    <div className="flex items-center gap-0.5">
      {TABS.map((t) => (
        <button
          key={t.value}
          onClick={() => setTab(t.value)}
          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
            tab === t.value ? "bg-blue-500 text-white" : "text-gray-500 hover:bg-gray-200"
          }`}
          title={t.value === "bundle" ? "Read-only: everything exported by Export Bundle" : "Editable: the plan sent to Laina"}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    resizeState.current = {
      startPos: isHorizontal ? e.clientX : e.clientY,
      startSize: size,
    };
  }, [size, isHorizontal]);

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    if (!resizeState.current) return;
    const currentPos = isHorizontal ? e.clientX : e.clientY;
    const delta = resizeState.current.startPos - currentPos;
    setSize(Math.min(MAX_SIZE, Math.max(MIN_SIZE, resizeState.current.startSize + delta)));
  }, [isHorizontal]);

  const onResizePointerUp = useCallback(() => {
    resizeState.current = null;
  }, []);

  const headerBar = (
    <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5 border-b border-gray-200">
      {tabBar}
      <div className="flex items-center gap-2">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
        <StatusBadge status={status} />
      </div>
    </div>
  );

  if (isHorizontal) {
    return (
      <div className={`flex flex-row ${className}`}>
        {!collapsed && (
          <div
            className="flex w-1.5 cursor-col-resize items-center justify-center border-l border-gray-300 bg-gray-100 hover:bg-gray-200"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
          >
            <div className="h-8 w-0.5 rounded-full bg-gray-400" />
          </div>
        )}
        <div className="flex flex-col" style={collapsed ? { width: 0 } : { width: size }}>
          {!collapsed && headerBar}
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <EditorArea text={text} theme={theme} status={status} onChange={handleChange} highlightRange={highlightRange} focusKey={selectedInstanceId ?? null} readOnly={tab === "bundle"} />
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex w-5 flex-shrink-0 items-center justify-center border-l border-gray-300 bg-gray-50 hover:bg-gray-100"
          title={collapsed ? "Show JSON Editor" : "Hide JSON Editor"}
        >
          <svg
            className={`h-3 w-3 text-gray-400 transition-transform ${collapsed ? "rotate-180" : ""}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M7.5 6l-4 4V2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-white ${className}`}>
      {!collapsed && (
        <div
          className="flex h-1.5 cursor-row-resize items-center justify-center border-t border-gray-300 bg-gray-100 hover:bg-gray-200"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
        >
          <div className="h-0.5 w-8 rounded-full bg-gray-400" />
        </div>
      )}
      <div className="flex w-full items-center justify-between border-t border-gray-300 bg-gray-50 px-3 py-1.5">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900"
        >
          <svg
            className={`h-3 w-3 text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M6 3.5l4 5H2z" />
          </svg>
          JSON Editor
        </button>
        {!collapsed && tabBar}
        <div className="flex items-center gap-2">
          {!collapsed && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
          <StatusBadge status={status} />
        </div>
      </div>
      {!collapsed && (
        <div className="overflow-hidden" style={{ height: size }}>
          <EditorArea text={text} theme={theme} status={status} onChange={handleChange} highlightRange={highlightRange} focusKey={selectedInstanceId ?? null} readOnly={tab === "bundle"} />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ValidationState }) {
  switch (status) {
    case "synced":
      return (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm3.354 4.646a.5.5 0 00-.708 0L7 9.293 5.354 7.646a.5.5 0 10-.708.708l2 2a.5.5 0 00.708 0l4-4a.5.5 0 000-.708z" />
          </svg>
          Synced
        </span>
      );
    case "valid":
      return (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm3.354 4.646a.5.5 0 00-.708 0L7 9.293 5.354 7.646a.5.5 0 10-.708.708l2 2a.5.5 0 00.708 0l4-4a.5.5 0 000-.708z" />
          </svg>
          Valid
        </span>
      );
    case "invalid-json":
      return (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 110 14A7 7 0 018 1zm-.5 3a.5.5 0 00-.5.5v4a.5.5 0 001 0v-4a.5.5 0 00-.5-.5zm0 7a.6.6 0 100-1.2.6.6 0 000 1.2z" />
          </svg>
          Invalid JSON
        </span>
      );
    case "invalid-range":
      return (
        <span className="flex items-center gap-1 text-xs text-amber-500" title="Days must be >= 0, and pre-op windows must end by the day of surgery">
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.982 1.566a1.13 1.13 0 00-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.891 0 1.44-.99.982-1.767L8.982 1.566zM8 5a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3A.5.5 0 018 5zm.5 7a.6.6 0 11-1.2 0 .6.6 0 011.2 0z" />
          </svg>
          Window out of range
        </span>
      );
    case "invalid-schema":
      return (
        <span className="flex items-center gap-1 text-xs text-amber-500">
          <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8.982 1.566a1.13 1.13 0 00-1.964 0L.165 13.233c-.457.778.091 1.767.982 1.767h13.706c.891 0 1.44-.99.982-1.767L8.982 1.566zM8 5a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3A.5.5 0 018 5zm.5 7a.6.6 0 11-1.2 0 .6.6 0 011.2 0z" />
          </svg>
          Invalid schema
        </span>
      );
  }
}

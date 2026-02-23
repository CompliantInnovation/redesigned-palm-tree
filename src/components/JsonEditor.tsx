"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plan, PlanAction, ExportedPlan } from "@/lib/types";
import { exportPlan, validateImportedPlan } from "@/lib/utils";

type ValidationState = "valid" | "invalid-json" | "invalid-schema" | "synced";

export type JsonEditorOrientation = "vertical" | "horizontal";

interface JsonEditorProps {
  plan: Plan;
  dispatch: React.Dispatch<PlanAction>;
  orientation: JsonEditorOrientation;
  className?: string;
}

function serializePlan(plan: Plan): string {
  return JSON.stringify(exportPlan(plan), null, 2);
}

function validate(text: string): { state: ValidationState; parsed?: ExportedPlan } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { state: "invalid-json" };
  }
  if (!validateImportedPlan(parsed)) {
    return { state: "invalid-schema" };
  }
  return { state: "valid", parsed: parsed as ExportedPlan };
}

const DEFAULT_SIZE = 300;
const MIN_SIZE = 80;
const MAX_SIZE = 800;

export function JsonEditor({ plan, dispatch, orientation, className = "" }: JsonEditorProps) {
  const [collapsed, setCollapsed] = useState(true);
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [text, setText] = useState(() => serializePlan(plan));
  const [status, setStatus] = useState<ValidationState>("synced");
  const isLocalEdit = useRef(false);
  const resizeState = useRef<{ startPos: number; startSize: number } | null>(null);

  const isHorizontal = orientation === "horizontal";

  useEffect(() => {
    if (isLocalEdit.current) {
      isLocalEdit.current = false;
      return;
    }
    const serialized = serializePlan(plan);
    setText(serialized);
    setStatus("synced");
  }, [plan]);

  const handleChange = useCallback(
    (value: string) => {
      setText(value);
      const result = validate(value);
      setStatus(result.state);
      if (result.state === "valid" && result.parsed) {
        isLocalEdit.current = true;
        dispatch({ type: "IMPORT_PLAN", plan: result.parsed });
        setStatus("synced");
      }
    },
    [dispatch]
  );

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
    // Dragging left / up should increase size
    const delta = resizeState.current.startPos - currentPos;
    setSize(Math.min(MAX_SIZE, Math.max(MIN_SIZE, resizeState.current.startSize + delta)));
  }, [isHorizontal]);

  const onResizePointerUp = useCallback(() => {
    resizeState.current = null;
  }, []);

  const textareaClasses = `h-full w-full resize-none border-0 bg-gray-950 p-3 font-mono text-xs leading-relaxed text-gray-100 focus:outline-none ${
    status === "invalid-json" || status === "invalid-schema"
      ? "ring-2 ring-inset ring-red-500/30"
      : ""
  }`;

  if (isHorizontal) {
    return (
      <div className={`flex flex-row ${className}`}>
        {/* Resize handle */}
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
        <div className={`flex flex-col ${collapsed ? "" : ""}`} style={collapsed ? { width: 0 } : { width: size }}>
          {!collapsed && (
            <div className="flex items-center justify-between bg-gray-50 px-3 py-1.5 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600">JSON Editor</span>
              <StatusBadge status={status} />
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <textarea
                value={text}
                onChange={(e) => handleChange(e.target.value)}
                spellCheck={false}
                className={textareaClasses}
              />
            </div>
          )}
        </div>
        {/* Collapse toggle — thin vertical tab on the edge */}
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

  // Vertical (bottom panel) layout
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
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between border-t border-gray-300 bg-gray-50 px-3 py-1.5 hover:bg-gray-100"
      >
        <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
          <svg
            className={`h-3 w-3 text-gray-400 transition-transform ${collapsed ? "" : "rotate-180"}`}
            viewBox="0 0 12 12"
            fill="currentColor"
          >
            <path d="M6 3.5l4 5H2z" />
          </svg>
          JSON Editor
        </span>
        <StatusBadge status={status} />
      </button>
      {!collapsed && (
        <div className="overflow-hidden" style={{ height: size }}>
          <textarea
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            spellCheck={false}
            className={textareaClasses}
          />
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

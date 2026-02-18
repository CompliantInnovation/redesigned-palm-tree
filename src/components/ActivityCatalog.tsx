"use client";

import { useState, useMemo } from "react";
import { ActivityType } from "@/lib/types";
import { catalogActivities } from "@/data/activities";
import { ActivityCatalogItem } from "./ActivityCatalogItem";

type FilterType = "ALL" | ActivityType;

export function ActivityCatalog() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");

  const filtered = useMemo(() => {
    return catalogActivities.filter((a) => {
      if (filter !== "ALL" && a.type !== filter) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, filter]);

  const filterButtons: { label: string; value: FilterType }[] = [
    { label: "All", value: "ALL" },
    { label: "Survey", value: "SURVEY" },
    { label: "Functional", value: "FUNCTIONAL_TEST" },
  ];

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-3">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">Activity Catalog</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities…"
          className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
        />
        <div className="flex gap-1">
          {filterButtons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className={`rounded px-2 py-0.5 text-xs font-medium ${
                filter === btn.value
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-3">
        {filtered.map((activity) => (
          <ActivityCatalogItem key={activity.id} activity={activity} />
        ))}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-400">No activities found</p>
        )}
      </div>
    </div>
  );
}

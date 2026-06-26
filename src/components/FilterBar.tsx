"use client";

import { motion, LayoutGroup } from "framer-motion";
import { Source, SortCategory, SortDirection } from "@/lib/types";

const sources: { key: Source | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hackernews", label: "HN" },
  { key: "github", label: "GitHub" },
  { key: "dev", label: "DEV" },
  { key: "infoq", label: "InfoQ" },
  { key: "stackoverflow", label: "SO" },
];

const sortOptions: { key: SortCategory; label: string }[] = [
  { key: "content", label: "Best Content" },
  { key: "length", label: "Length" },
  { key: "difficulty", label: "Difficulty" },
];

interface FilterBarProps {
  activeSource: Source | "all";
  activeSort: SortCategory;
  sortDirection: SortDirection;
  todayOnly: boolean;
  onSourceChange: (source: Source | "all") => void;
  onSortChange: (sort: SortCategory) => void;
  onDirectionToggle: () => void;
  onTodayToggle: () => void;
}

export function FilterBar({
  activeSource,
  activeSort,
  sortDirection,
  todayOnly,
  onSourceChange,
  onSortChange,
  onDirectionToggle,
  onTodayToggle,
}: FilterBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex flex-col gap-4 mb-8"
    >
      {/* Top row: Source filter + Today toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <LayoutGroup id="source-filters">
          <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
            {sources.map((source) => (
              <button
                key={source.key}
                onClick={() => onSourceChange(source.key)}
                className={`relative text-sm px-3 py-1.5 rounded-md transition-colors duration-200 cursor-pointer ${
                  activeSource === source.key
                    ? "text-foreground font-medium"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {activeSource === source.key && (
                  <motion.div
                    layoutId="sourceIndicator"
                    className="absolute inset-0 bg-card rounded-md shadow-sm pointer-events-none"
                    transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <span className="relative z-10">{source.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>

        {/* Today filter toggle */}
        <button
          onClick={onTodayToggle}
          className={`text-sm px-3 py-1.5 rounded-lg border transition-all duration-200 cursor-pointer ${
            todayOnly
              ? "bg-accent text-white border-accent shadow-sm shadow-accent/20"
              : "bg-surface text-muted border-transparent hover:text-foreground hover:border-border"
          }`}
        >
          Published Today
        </button>
      </div>

      {/* Bottom row: Sort options + direction toggle */}
      <div className="flex items-center gap-2">
        <LayoutGroup id="sort-filters">
          <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
            {sortOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => onSortChange(option.key)}
                className={`relative text-sm px-3 py-1.5 rounded-md transition-colors duration-200 cursor-pointer ${
                  activeSort === option.key
                    ? "text-foreground font-medium"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {activeSort === option.key && (
                  <motion.div
                    layoutId="sortIndicator"
                    className="absolute inset-0 bg-card rounded-md shadow-sm pointer-events-none"
                    transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
                  />
                )}
                <span className="relative z-10">{option.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>

        {/* Sort direction toggle */}
        <button
          onClick={onDirectionToggle}
          className="flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-lg bg-surface text-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
          title={sortDirection === "desc" ? "Highest first" : "Lowest first"}
        >
          <motion.svg
            animate={{ rotate: sortDirection === "asc" ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </motion.svg>
          <span className="text-xs">
            {sortDirection === "desc" ? "High" : "Low"}
          </span>
        </button>
      </div>
    </motion.div>
  );
}

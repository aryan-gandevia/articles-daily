"use client";

import { motion } from "framer-motion";
import { Source, SortCategory } from "@/lib/types";

const sources: { key: Source | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hackernews", label: "HN" },
  { key: "github", label: "GitHub" },
  { key: "dev", label: "DEV" },
  { key: "infoq", label: "InfoQ" },
  { key: "stackoverflow", label: "SO" },
];

const sortOptions: { key: SortCategory; label: string; description: string }[] = [
  { key: "content", label: "Best Content", description: "Highest quality" },
  { key: "length", label: "Length", description: "Reading time" },
  { key: "difficulty", label: "Difficulty", description: "Complexity level" },
];

interface FilterBarProps {
  activeSource: Source | "all";
  activeSort: SortCategory;
  onSourceChange: (source: Source | "all") => void;
  onSortChange: (sort: SortCategory) => void;
}

export function FilterBar({
  activeSource,
  activeSort,
  onSourceChange,
  onSortChange,
}: FilterBarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
    >
      {/* Source filter */}
      <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
        {sources.map((source) => (
          <button
            key={source.key}
            onClick={() => onSourceChange(source.key)}
            className={`relative text-sm px-3 py-1.5 rounded-md transition-all duration-200 ${
              activeSource === source.key
                ? "text-foreground font-medium"
                : "text-muted hover:text-foreground"
            }`}
          >
            {activeSource === source.key && (
              <motion.div
                layoutId="sourceIndicator"
                className="absolute inset-0 bg-card rounded-md shadow-sm"
                transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              />
            )}
            <span className="relative z-10">{source.label}</span>
          </button>
        ))}
      </div>

      {/* Sort options */}
      <div className="flex items-center gap-1 bg-surface rounded-lg p-1">
        {sortOptions.map((option) => (
          <button
            key={option.key}
            onClick={() => onSortChange(option.key)}
            className={`relative text-sm px-3 py-1.5 rounded-md transition-all duration-200 ${
              activeSort === option.key
                ? "text-foreground font-medium"
                : "text-muted hover:text-foreground"
            }`}
          >
            {activeSort === option.key && (
              <motion.div
                layoutId="sortIndicator"
                className="absolute inset-0 bg-card rounded-md shadow-sm"
                transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

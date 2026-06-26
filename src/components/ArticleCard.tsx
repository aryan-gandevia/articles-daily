"use client";

import { motion } from "framer-motion";
import { Article } from "@/lib/types";

const sourceColors: Record<string, string> = {
  hackernews: "bg-orange-100 text-orange-700",
  github: "bg-gray-100 text-gray-700",
  dev: "bg-indigo-100 text-indigo-700",
  infoq: "bg-emerald-100 text-emerald-700",
  stackoverflow: "bg-amber-100 text-amber-700",
};

const sourceLabels: Record<string, string> = {
  hackernews: "Hacker News",
  github: "GitHub",
  dev: "DEV",
  infoq: "InfoQ",
  stackoverflow: "Stack Overflow",
};

interface ArticleCardProps {
  article: Article;
  index: number;
  onClick: () => void;
}

export function ArticleCard({ article, index, onClick }: ArticleCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      onClick={onClick}
      className="group cursor-pointer border border-border/60 rounded-xl p-5 bg-card hover:bg-card-hover hover:border-accent/20 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceColors[article.source] || "bg-gray-100 text-gray-600"}`}
            >
              {sourceLabels[article.source] || article.source}
            </span>
            {article.estimatedReadTime && (
              <span className="text-xs text-muted">
                {article.estimatedReadTime} min read
              </span>
            )}
          </div>
          <h3 className="font-semibold text-foreground leading-snug group-hover:text-accent transition-colors duration-200 line-clamp-2">
            {article.title}
          </h3>
          {article.description && (
            <p className="text-sm text-muted mt-1.5 line-clamp-2 leading-relaxed">
              {article.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-3">
            {article.author && (
              <span className="text-xs text-muted">by {article.author}</span>
            )}
            {article.tags && article.tags.length > 0 && (
              <div className="flex gap-1.5">
                {article.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-muted/70 bg-surface px-1.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <ScorePill label="Quality" value={article.contentScore} />
          <ScorePill label="Length" value={article.lengthScore} />
          <ScorePill label="Difficulty" value={article.difficultyScore} />
        </div>
      </div>
    </motion.article>
  );
}

function ScorePill({ label, value }: { label: string; value?: number }) {
  if (!value) return null;

  const getColor = (v: number) => {
    if (v <= 3) return "text-emerald-600 bg-emerald-50";
    if (v <= 6) return "text-amber-600 bg-amber-50";
    return "text-rose-600 bg-rose-50";
  };

  return (
    <div
      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${getColor(value)}`}
    >
      <span className="opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

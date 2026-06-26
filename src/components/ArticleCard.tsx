"use client";

import { motion } from "framer-motion";
import { format, isToday, parseISO } from "date-fns";
import { Article } from "@/lib/types";

const sourceColors: Record<string, string> = {
  hackernews: "bg-orange-100 text-black dark:bg-orange-500/20 dark:text-white",
  github: "bg-gray-200 text-black dark:bg-gray-500/20 dark:text-white",
  dev: "bg-indigo-100 text-black dark:bg-indigo-500/20 dark:text-white",
  infoq: "bg-emerald-100 text-black dark:bg-emerald-500/20 dark:text-white",
  stackoverflow: "bg-amber-100 text-black dark:bg-amber-500/20 dark:text-white",
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
  isFavourited?: boolean;
  showFavouriteButton?: boolean;
  onFavourite?: () => void;
}

export function ArticleCard({ article, index, onClick, isFavourited, showFavouriteButton, onFavourite }: ArticleCardProps) {
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
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            {article.author && (
              <span className="text-xs text-muted">by {article.author}</span>
            )}
            {article.publishedAt && (
              <>
                <span className="text-muted/30">·</span>
                <span className={`text-xs ${isToday(parseISO(article.publishedAt)) ? "text-accent font-medium" : "text-muted"}`}>
                  {isToday(parseISO(article.publishedAt))
                    ? "Today"
                    : format(parseISO(article.publishedAt), "MMM d, yyyy")}
                </span>
              </>
            )}
            {article.tags && article.tags.length > 0 && (
              <div className="flex gap-1.5">
                {article.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-muted bg-surface px-1.5 py-0.5 rounded border border-border/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {showFavouriteButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onFavourite?.();
              }}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                isFavourited
                  ? "text-rose-500 hover:text-rose-600"
                  : "text-muted/40 hover:text-rose-400"
              }`}
              title={isFavourited ? "Remove from favourites" : "Add to favourites"}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill={isFavourited ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}
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
    if (v <= 3) return "text-black bg-emerald-100 dark:text-white dark:bg-emerald-500/20";
    if (v <= 6) return "text-black bg-amber-100 dark:text-white dark:bg-amber-500/20";
    return "text-black bg-rose-100 dark:text-white dark:bg-rose-500/20";
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

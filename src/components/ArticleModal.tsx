"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Article } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";

interface ArticleModalProps {
  article: Article | null;
  onClose: () => void;
}

export function ArticleModal({ article, onClose }: ArticleModalProps) {
  const [summary, setSummary] = useState<string>("");
  const [keyTakeaways, setKeyTakeaways] = useState<string[]>([]);
  const [isAiGenerated, setIsAiGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchSummary = useCallback(async (art: Article) => {
    // If summary is already pre-generated (from DB), use it instantly
    if (art.summary) {
      setSummary(art.summary);
      setKeyTakeaways(art.keyTakeaways || []);
      setIsAiGenerated(true);
      setLoading(false);
      return;
    }

    // Otherwise fetch on-demand (cold start / fallback)
    setLoading(true);
    setSummary("");
    setKeyTakeaways([]);
    setIsAiGenerated(false);

    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: art.url, title: art.title }),
      });
      const data = await res.json();
      setSummary(data.summary || "Unable to generate summary.");
      setKeyTakeaways(data.keyTakeaways || []);
      setIsAiGenerated(data.aiGenerated || false);
    } catch {
      setSummary("Failed to load summary. Please try again.");
      setIsAiGenerated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (article) {
      fetchSummary(article);
    }
  }, [article, fetchSummary]);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      {article && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-4 sm:inset-x-auto sm:inset-y-8 sm:mx-auto sm:max-w-2xl sm:w-full sm:h-[calc(100vh-4rem)] bg-card rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-border/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-light transition-colors mb-2"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    Read original article
                  </a>
                  <h2 className="text-xl font-bold text-foreground leading-snug">
                    {article.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted">
                    {article.author && <span>by {article.author}</span>}
                    {article.estimatedReadTime && (
                      <>
                        <span className="text-border">·</span>
                        <span>{article.estimatedReadTime} min read</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface transition-colors text-muted hover:text-foreground"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-6 h-6 border-2 border-accent/20 border-t-accent rounded-full"
                  />
                  <p className="text-sm text-muted">
                    Generating AI summary...
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {/* Summary */}
                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Summary
                      </h3>
                      {isAiGenerated && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-black dark:bg-emerald-500/20 dark:text-white text-[10px] font-medium">
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                          AI Generated
                        </span>
                      )}
                    </div>
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-line">
                      {summary}
                    </p>
                  </div>

                  {/* Key Takeaways */}
                  {keyTakeaways.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                        Key Takeaways
                      </h3>
                      <ul className="space-y-2">
                        {keyTakeaways.map((takeaway, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed"
                          >
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-accent mt-2" />
                            {takeaway}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Scores */}
                  <div className="mt-8 pt-6 border-t border-border/50">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                      Article Metrics
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <MetricCard
                        label="Content Quality"
                        value={article.contentScore}
                      />
                      <MetricCard
                        label="Length"
                        value={article.lengthScore}
                      />
                      <MetricCard
                        label="Difficulty"
                        value={article.difficultyScore}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MetricCard({ label, value }: { label: string; value?: number }) {
  if (!value) return null;

  return (
    <div className="text-center p-3 rounded-lg bg-surface">
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
      <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value * 10}%` }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="h-full rounded-full bg-accent"
        />
      </div>
    </div>
  );
}

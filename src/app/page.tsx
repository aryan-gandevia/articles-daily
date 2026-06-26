"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Article, Source, SortCategory, SortDirection } from "@/lib/types";
import { Header } from "@/components/Header";
import { FilterBar } from "@/components/FilterBar";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleModal } from "@/components/ArticleModal";
import { LoadingState } from "@/components/LoadingState";
import { Footer } from "@/components/Footer";

type ViewMode = "today" | "popular";

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>();
  const [viewMode, setViewMode] = useState<ViewMode>("today");
  const [activeSource, setActiveSource] = useState<Source | "all">("all");
  const [activeSort, setActiveSort] = useState<SortCategory>("content");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [todayOnly, setTodayOnly] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  useEffect(() => {
    async function fetchArticles() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/articles?view=${viewMode}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setArticles(data.articles || []);
        setFetchedAt(data.fetchedAt);
      } catch (err) {
        console.error("Failed to fetch articles:", err);
        setError("Failed to load articles. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }
    fetchArticles();
  }, [viewMode]);

  const filteredAndSorted = useMemo(() => {
    let filtered = articles;

    // Filter by source
    if (activeSource !== "all") {
      filtered = filtered.filter((a) => a.source === activeSource);
    }

    // Filter by published today (using local timezone)
    if (todayOnly) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000;
      filtered = filtered.filter((a) => {
        if (!a.publishedAt) return false;
        const pubTime = new Date(a.publishedAt).getTime();
        return pubTime >= todayStart && pubTime < todayEnd;
      });
    }

    // Sort by selected category
    const dir = sortDirection === "desc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (activeSort) {
        case "content":
          return ((b.contentScore || 0) - (a.contentScore || 0)) * dir;
        case "length":
          return ((b.lengthScore || 0) - (a.lengthScore || 0)) * dir;
        case "difficulty":
          return ((b.difficultyScore || 0) - (a.difficultyScore || 0)) * dir;
        default:
          return 0;
      }
    });
  }, [articles, activeSource, activeSort, sortDirection, todayOnly]);

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg text-foreground mb-2">Something went wrong</p>
          <p className="text-sm text-muted mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-light transition-colors"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
      {loading ? (
        <LoadingState />
      ) : (
        <>
          <Header articleCount={articles.length} fetchedAt={fetchedAt} />

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 mb-6 p-1 bg-surface rounded-xl w-fit">
            <button
              onClick={() => setViewMode("today")}
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            >
              {viewMode === "today" && (
                <motion.div
                  layoutId="viewToggle"
                  className="absolute inset-0 bg-card rounded-lg shadow-sm"
                  transition={{ type: "spring", duration: 0.4 }}
                />
              )}
              <span className={`relative z-10 ${viewMode === "today" ? "text-foreground" : "text-muted"}`}>
                Today&apos;s Articles
              </span>
            </button>
            <button
              onClick={() => setViewMode("popular")}
              className="relative px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            >
              {viewMode === "popular" && (
                <motion.div
                  layoutId="viewToggle"
                  className="absolute inset-0 bg-card rounded-lg shadow-sm"
                  transition={{ type: "spring", duration: 0.4 }}
                />
              )}
              <span className={`relative z-10 ${viewMode === "popular" ? "text-foreground" : "text-muted"}`}>
                Popular Articles
              </span>
            </button>
          </div>

          <FilterBar
            activeSource={activeSource}
            activeSort={activeSort}
            sortDirection={sortDirection}
            todayOnly={todayOnly}
            onSourceChange={setActiveSource}
            onSortChange={setActiveSort}
            onDirectionToggle={() => setSortDirection((prev) => prev === "desc" ? "asc" : "desc")}
            onTodayToggle={() => setTodayOnly((prev) => !prev)}
          />

          <div className="space-y-3">
            {filteredAndSorted.map((article, index) => (
              <ArticleCard
                key={article.id}
                article={article}
                index={index}
                onClick={() => setSelectedArticle(article)}
              />
            ))}
          </div>

          {filteredAndSorted.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted">
                {viewMode === "popular"
                  ? "No popular articles yet. Articles that appear across multiple days will show up here."
                  : "No articles found for this filter."}
              </p>
            </div>
          )}

          <Footer />

          <ArticleModal
            article={selectedArticle}
            onClose={() => setSelectedArticle(null)}
          />
        </>
      )}
    </main>
  );
}

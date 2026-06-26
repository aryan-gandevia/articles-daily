"use client";

import { useEffect, useState, useMemo } from "react";
import { Article, Source, SortCategory } from "@/lib/types";
import { Header } from "@/components/Header";
import { FilterBar } from "@/components/FilterBar";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleModal } from "@/components/ArticleModal";
import { LoadingState } from "@/components/LoadingState";
import { Footer } from "@/components/Footer";

export default function Home() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>();
  const [activeSource, setActiveSource] = useState<Source | "all">("all");
  const [activeSort, setActiveSort] = useState<SortCategory>("content");
  const [todayOnly, setTodayOnly] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const res = await fetch("/api/articles");
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
  }, []);

  const filteredAndSorted = useMemo(() => {
    let filtered = articles;

    // Filter by source
    if (activeSource !== "all") {
      filtered = filtered.filter((a) => a.source === activeSource);
    }

    // Filter by published today
    if (todayOnly) {
      const today = new Date().toISOString().split("T")[0];
      filtered = filtered.filter((a) => {
        if (!a.publishedAt) return false;
        return a.publishedAt.startsWith(today);
      });
    }

    // Sort by selected category (descending)
    return [...filtered].sort((a, b) => {
      switch (activeSort) {
        case "content":
          return (b.contentScore || 0) - (a.contentScore || 0);
        case "length":
          return (b.lengthScore || 0) - (a.lengthScore || 0);
        case "difficulty":
          return (b.difficultyScore || 0) - (a.difficultyScore || 0);
        default:
          return 0;
      }
    });
  }, [articles, activeSource, activeSort, todayOnly]);

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

          <FilterBar
            activeSource={activeSource}
            activeSort={activeSort}
            todayOnly={todayOnly}
            onSourceChange={setActiveSource}
            onSortChange={setActiveSort}
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
              <p className="text-muted">No articles found for this filter.</p>
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

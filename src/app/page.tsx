"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Article, Source, SortCategory, SortDirection } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { Header } from "@/components/Header";
import { FilterBar } from "@/components/FilterBar";
import { ArticleCard } from "@/components/ArticleCard";
import { ArticleModal } from "@/components/ArticleModal";
import { AuthModal } from "@/components/AuthModal";
import { LoadingState } from "@/components/LoadingState";
import { Footer } from "@/components/Footer";

type ViewMode = "today" | "popular" | "favourites";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [favouriteUrls, setFavouriteUrls] = useState<Set<string>>(new Set());

  // Fetch articles based on view mode
  useEffect(() => {
    async function fetchArticles() {
      setLoading(true);
      setError(null);
      try {
        let url: string;
        if (viewMode === "favourites") {
          url = "/api/favourites";
        } else {
          url = `/api/articles?view=${viewMode}`;
        }

        const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 401 && viewMode === "favourites") {
            setArticles([]);
            setLoading(false);
            return;
          }
          throw new Error("Failed to fetch");
        }
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

  // Load user's favourite URLs for heart state
  useEffect(() => {
    async function loadFavouriteUrls() {
      if (!user) {
        setFavouriteUrls(new Set());
        return;
      }
      try {
        const res = await fetch("/api/favourites");
        if (res.ok) {
          const data = await res.json();
          setFavouriteUrls(new Set((data.articles || []).map((a: Article) => a.url)));
        }
      } catch {
        // ignore
      }
    }
    loadFavouriteUrls();
  }, [user]);

  const handleFavourite = async (article: Article, confirmEviction = false) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const res = await fetch("/api/favourites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ article, confirmEviction }),
    });

    const data = await res.json();

    if (res.status === 409 && data.error === "limit_reached") {
      // Show confirmation dialog
      const confirmed = window.confirm(
        "You have 50 favourited articles. Adding this will remove your oldest favourite. Continue?"
      );
      if (confirmed) {
        await handleFavourite(article, true);
      }
      return;
    }

    if (res.ok) {
      setFavouriteUrls((prev) => new Set([...prev, article.url]));
    }
  };

  const handleUnfavourite = async (url: string) => {
    const res = await fetch("/api/favourites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (res.ok) {
      setFavouriteUrls((prev) => {
        const next = new Set(prev);
        next.delete(url);
        return next;
      });
      // Refresh favourites view if active
      if (viewMode === "favourites") {
        setArticles((prev) => prev.filter((a) => a.url !== url));
      }
    }
  };

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
            className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-light transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16">
      {loading || authLoading ? (
        <LoadingState />
      ) : (
        <>
          <Header
            articleCount={articles.length}
            fetchedAt={fetchedAt}
            user={user}
            onAuthClick={() => setShowAuthModal(true)}
          />

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 mb-6 p-1 bg-surface rounded-xl w-fit">
            {(["today", "popular", "favourites"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  if (mode === "favourites" && !user) {
                    setShowAuthModal(true);
                    return;
                  }
                  setViewMode(mode);
                }}
                className="relative px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                {viewMode === mode && (
                  <motion.div
                    layoutId="viewToggle"
                    className="absolute inset-0 bg-card rounded-lg shadow-sm"
                    transition={{ type: "spring", duration: 0.4 }}
                  />
                )}
                <span className={`relative z-10 ${viewMode === mode ? "text-foreground" : "text-muted"}`}>
                  {mode === "today" ? "Today\u2019s Articles" : mode === "popular" ? "Popular" : "Favourites"}
                </span>
              </button>
            ))}
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

          {/* Favourites empty state for non-logged-in users */}
          {viewMode === "favourites" && !user && (
            <div className="text-center py-16">
              <p className="text-muted mb-3">You need an account to favourite articles.</p>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent-light transition-colors cursor-pointer"
              >
                Sign up
              </button>
            </div>
          )}

          {/* Articles list */}
          {!(viewMode === "favourites" && !user) && (
            <div className="space-y-3">
              {filteredAndSorted.map((article, index) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  index={index}
                  onClick={() => setSelectedArticle(article)}
                  isFavourited={favouriteUrls.has(article.url)}
                  showFavouriteButton={!!user}
                  onFavourite={() =>
                    favouriteUrls.has(article.url)
                      ? handleUnfavourite(article.url)
                      : handleFavourite(article)
                  }
                />
              ))}
            </div>
          )}

          {!(viewMode === "favourites" && !user) && filteredAndSorted.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted">
                {viewMode === "popular"
                  ? "No popular articles yet. Articles that appear across multiple days will show up here."
                  : viewMode === "favourites"
                  ? "You haven\u2019t favourited any articles yet."
                  : "No articles found for this filter."}
              </p>
            </div>
          )}

          <Footer />

          <ArticleModal
            article={selectedArticle}
            onClose={() => setSelectedArticle(null)}
          />

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        </>
      )}
    </main>
  );
}

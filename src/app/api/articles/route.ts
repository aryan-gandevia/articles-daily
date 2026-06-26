import { NextRequest, NextResponse } from "next/server";
import { getTodaysArticles, getPopularArticles, logAppEvent } from "@/lib/supabase";
import { fetchHackerNews } from "@/lib/sources/hackernews";
import { fetchGitHubTrending } from "@/lib/sources/github";
import { fetchDevArticles } from "@/lib/sources/dev";
import { fetchStackOverflow } from "@/lib/sources/stackoverflow";
import { fetchInfoQ } from "@/lib/sources/infoq";
import { enrichWithWordCounts } from "@/lib/wordcount";
import { rankArticles } from "@/lib/ranking";

export async function GET(request: NextRequest) {
  const view = request.nextUrl.searchParams.get("view") || "today";

  try {
    if (view === "popular") {
      const articles = await getPopularArticles();
      return NextResponse.json({
        articles,
        view: "popular",
        fetchedAt: new Date().toISOString(),
      });
    }

    // Default: today's articles
    const dbArticles = await getTodaysArticles();

    if (dbArticles.length > 0) {
      return NextResponse.json({
        articles: dbArticles,
        view: "today",
        fetchedAt: new Date().toISOString(),
        fromCache: true,
      });
    }

    // Fallback: fetch live (cron hasn't run yet today)
    const [hn, github, dev, so, infoq] = await Promise.all([
      fetchHackerNews(),
      fetchGitHubTrending(),
      fetchDevArticles(),
      fetchStackOverflow(),
      fetchInfoQ(),
    ]);

    const allArticles = [
      ...hn.slice(0, 8),
      ...github.slice(0, 6),
      ...dev.slice(0, 6),
      ...so.slice(0, 5),
      ...infoq.slice(0, 5),
    ];

    const enriched = await enrichWithWordCounts(allArticles);
    const rankedArticles = rankArticles(enriched);

    return NextResponse.json({
      articles: rankedArticles,
      view: "today",
      fetchedAt: new Date().toISOString(),
      fromCache: false,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching articles:", error);
    await logAppEvent("error", "api-articles", "Failed to fetch articles", {
      error: errorMessage,
      view,
    });
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCachedDigest } from "@/lib/cache";
import { fetchHackerNews } from "@/lib/sources/hackernews";
import { fetchGitHubTrending } from "@/lib/sources/github";
import { fetchDevArticles } from "@/lib/sources/dev";
import { fetchStackOverflow } from "@/lib/sources/stackoverflow";
import { fetchInfoQ } from "@/lib/sources/infoq";
import { enrichWithWordCounts } from "@/lib/wordcount";
import { rankArticles } from "@/lib/ranking";

export async function GET() {
  // Try to serve from cache first (populated by cron job)
  const cached = getCachedDigest();
  if (cached) {
    return NextResponse.json({
      articles: cached.articles,
      fetchedAt: cached.generatedAt,
      sources: cached.sources,
      fromCache: true,
    });
  }

  // Fallback: fetch live (cold start or cron hasn't run yet)
  try {
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

    // Enrich with real word counts
    const enriched = await enrichWithWordCounts(allArticles);

    // Rank articles (uses heuristic difficulty since no LLM on live fallback)
    const rankedArticles = rankArticles(enriched);

    return NextResponse.json({
      articles: rankedArticles,
      fetchedAt: new Date().toISOString(),
      sources: {
        hackernews: hn.slice(0, 8).length,
        github: github.slice(0, 6).length,
        dev: dev.slice(0, 6).length,
        stackoverflow: so.slice(0, 5).length,
        infoq: infoq.slice(0, 5).length,
      },
      fromCache: false,
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

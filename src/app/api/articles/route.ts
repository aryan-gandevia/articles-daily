import { NextResponse } from "next/server";
import { fetchHackerNews } from "@/lib/sources/hackernews";
import { fetchGitHubTrending } from "@/lib/sources/github";
import { fetchDevArticles } from "@/lib/sources/dev";
import { fetchStackOverflow } from "@/lib/sources/stackoverflow";
import { fetchInfoQ } from "@/lib/sources/infoq";
import { rankArticles } from "@/lib/ranking";
import { enrichWithWordCounts } from "@/lib/wordcount";

export async function GET() {
  try {
    // Fetch from all sources in parallel
    const [hn, github, dev, so, infoq] = await Promise.all([
      fetchHackerNews(),
      fetchGitHubTrending(),
      fetchDevArticles(),
      fetchStackOverflow(),
      fetchInfoQ(),
    ]);

    const allArticles = [...hn, ...github, ...dev, ...so, ...infoq];

    // Enrich with real word counts from article content
    const enriched = await enrichWithWordCounts(allArticles);

    // Rank all articles using real data
    const rankedArticles = rankArticles(enriched);

    return NextResponse.json({
      articles: rankedArticles,
      fetchedAt: new Date().toISOString(),
      sources: {
        hackernews: hn.length,
        github: github.length,
        dev: dev.length,
        stackoverflow: so.length,
        infoq: infoq.length,
      },
    });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch articles" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { fetchHackerNews } from "@/lib/sources/hackernews";
import { fetchGitHubTrending } from "@/lib/sources/github";
import { fetchDevArticles } from "@/lib/sources/dev";
import { fetchStackOverflow } from "@/lib/sources/stackoverflow";
import { fetchInfoQ } from "@/lib/sources/infoq";
import { enrichWithWordCounts } from "@/lib/wordcount";
import { rankArticles } from "@/lib/ranking";
import { setCachedDigest } from "@/lib/cache";
import { scoreDifficultyWithLLM } from "@/lib/difficulty";
import { generateSummaryBatch } from "@/lib/summaries";
import { Article } from "@/lib/types";

export const maxDuration = 60; // Allow up to 60s on Vercel Pro, 10s on Hobby

export async function POST(request: NextRequest) {
  // Verify the request is from our cron job
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting daily article generation...");

    // 1. Fetch from all sources in parallel
    const [hn, github, dev, so, infoq] = await Promise.all([
      fetchHackerNews(),
      fetchGitHubTrending(),
      fetchDevArticles(),
      fetchStackOverflow(),
      fetchInfoQ(),
    ]);

    // Limit to 30 articles total (top from each source)
    const allArticles: Article[] = [
      ...hn.slice(0, 8),
      ...github.slice(0, 6),
      ...dev.slice(0, 6),
      ...so.slice(0, 5),
      ...infoq.slice(0, 5),
    ];

    console.log(`[Cron] Fetched ${allArticles.length} articles`);

    // 2. Enrich with real word counts
    const enriched = await enrichWithWordCounts(allArticles);
    console.log("[Cron] Word counts enriched");

    // 3. Rank articles (length, content quality)
    const ranked = rankArticles(enriched);

    // 4. Score difficulty with Groq LLM
    const withDifficulty = await scoreDifficultyWithLLM(ranked);
    console.log("[Cron] Difficulty scored via LLM");

    // 5. Generate AI summaries for all articles
    const withSummaries = await generateSummaryBatch(withDifficulty);
    console.log("[Cron] Summaries generated");

    // 6. Store in memory cache
    const sources = {
      hackernews: hn.slice(0, 8).length,
      github: github.slice(0, 6).length,
      dev: dev.slice(0, 6).length,
      stackoverflow: so.slice(0, 5).length,
      infoq: infoq.slice(0, 5).length,
    };

    setCachedDigest({
      articles: withSummaries,
      generatedAt: new Date().toISOString(),
      sources,
    });

    console.log("[Cron] Cache populated. Done!");

    return NextResponse.json({
      success: true,
      articlesProcessed: withSummaries.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Failed:", error);
    return NextResponse.json(
      { error: "Failed to generate digest" },
      { status: 500 }
    );
  }
}

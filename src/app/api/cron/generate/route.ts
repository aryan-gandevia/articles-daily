import { NextRequest, NextResponse } from "next/server";
import { fetchHackerNews } from "@/lib/sources/hackernews";
import { fetchGitHubTrending } from "@/lib/sources/github";
import { fetchDevArticles } from "@/lib/sources/dev";
import { fetchStackOverflow } from "@/lib/sources/stackoverflow";
import { fetchInfoQ } from "@/lib/sources/infoq";
import { enrichWithWordCounts } from "@/lib/wordcount";
import { rankArticles } from "@/lib/ranking";
import { scoreDifficultyWithLLM } from "@/lib/difficulty";
import {
  getAllArticleUrls,
  getPopularArticleUrls,
  replaceArticles,
} from "@/lib/supabase";
import { Article } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Verify the request is from our cron job
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron] Starting daily article generation...");

    // 1. Get previously seen URLs (from yesterday's articles + popular)
    const [previousUrls, popularUrls] = await Promise.all([
      getAllArticleUrls(),
      getPopularArticleUrls(),
    ]);
    const allKnownUrls = new Set([...previousUrls, ...popularUrls]);

    console.log(`[Cron] Known URLs: ${allKnownUrls.size} (${previousUrls.length} from articles, ${popularUrls.length} from popular)`);

    // 2. Fetch from all sources in parallel (fetch more to have room after filtering)
    const [hn, github, dev, so, infoq] = await Promise.all([
      fetchHackerNews(),
      fetchGitHubTrending(),
      fetchDevArticles(),
      fetchStackOverflow(),
      fetchInfoQ(),
    ]);

    const allFetched: Article[] = [...hn, ...github, ...dev, ...so, ...infoq];
    console.log(`[Cron] Fetched ${allFetched.length} articles from sources`);

    // 3. Separate into repeats (seen before) and new articles
    const repeats: Article[] = [];
    const newArticles: Article[] = [];

    for (const article of allFetched) {
      if (previousUrls.includes(article.url)) {
        // Was in yesterday's articles table — it's a repeat
        repeats.push(article);
      } else if (!popularUrls.includes(article.url)) {
        // Not in popular either — genuinely new
        newArticles.push(article);
      } else {
        // Already in popular_articles — still a repeat, increment count
        repeats.push(article);
      }
    }

    console.log(`[Cron] Repeats: ${repeats.length}, New: ${newArticles.length}`);

    // 4. Take top 30 new articles
    const todaysArticles = newArticles.slice(0, 30);

    // 5. Enrich with real word counts
    const enriched = await enrichWithWordCounts(todaysArticles);
    console.log("[Cron] Word counts enriched");

    // 6. Rank articles (length, content quality)
    const ranked = rankArticles(enriched);

    // 7. Score difficulty with Groq LLM (1 API call for all articles)
    const withDifficulty = await scoreDifficultyWithLLM(ranked);
    console.log("[Cron] Difficulty scored via LLM");

    // 8. Atomically refresh articles and popular_articles tables
    await replaceArticles(withDifficulty, repeats);
    console.log("[Cron] Database refreshed atomically.");

    return NextResponse.json({
      success: true,
      articlesProcessed: withDifficulty.length,
      repeatsFound: repeats.length,
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

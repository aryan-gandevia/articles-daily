import * as cheerio from "cheerio";
import { Article } from "./types";

/**
 * Fetches the actual article content and returns the word count.
 * Falls back to a heuristic estimate if fetching fails.
 */
async function fetchWordCount(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove non-content elements
    $("script, style, nav, footer, header, aside, .ad, .advertisement, .sidebar, .comments").remove();

    // Try to isolate main content
    const selectors = [
      "article",
      "[role='main']",
      ".post-content",
      ".article-content",
      ".entry-content",
      ".markdown-body",
      "main",
      ".content",
    ];

    let text = "";
    for (const selector of selectors) {
      const el = $(selector);
      if (el.length && el.text().trim().length > 200) {
        text = el.text().trim();
        break;
      }
    }

    // Fallback to body
    if (!text || text.length < 200) {
      text = $("body").text().trim();
    }

    // Clean and count words
    const cleaned = text
      .replace(/\s+/g, " ")
      .replace(/[^\w\s]/g, " ")
      .trim();

    const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
    return words.length;
  } catch {
    return null;
  }
}

/**
 * Enriches articles with real word counts by fetching their content in parallel.
 * Uses a concurrency limit to avoid overwhelming targets.
 */
export async function enrichWithWordCounts(articles: Article[]): Promise<Article[]> {
  const CONCURRENCY = 10;
  const results: Article[] = [...articles];

  // Process in batches
  for (let i = 0; i < articles.length; i += CONCURRENCY) {
    const batch = articles.slice(i, i + CONCURRENCY);
    const counts = await Promise.all(
      batch.map((article) => {
        // DEV.to already provides read time, skip scraping
        if (article.estimatedReadTime && article.source === "dev") {
          return Promise.resolve(article.estimatedReadTime * 200);
        }
        return fetchWordCount(article.url);
      })
    );

    for (let j = 0; j < batch.length; j++) {
      const idx = i + j;
      if (counts[j] !== null && counts[j]! > 50) {
        results[idx] = { ...results[idx], wordCount: counts[j]! };
      }
    }
  }

  return results;
}

import Groq from "groq-sdk";
import * as cheerio from "cheerio";
import { Article } from "./types";

interface ArticleWithSummary extends Article {
  summary?: string;
  keyTakeaways?: string[];
}

/**
 * Fetches article content and generates AI summaries in parallel batches.
 */
export async function generateSummaryBatch(articles: Article[]): Promise<ArticleWithSummary[]> {
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    console.warn("[Summaries] No GROQ_API_KEY set, skipping summaries");
    return articles;
  }

  const groq = new Groq({ apiKey: groqKey });
  const results: ArticleWithSummary[] = [...articles];

  // Process in batches of 5 to respect rate limits (~30 req/min)
  const BATCH_SIZE = 5;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    const summaries = await Promise.all(
      batch.map(async (article) => {
        try {
          const content = await fetchArticleContent(article.url);
          const summary = await summarizeWithGroq(groq, article.title, content);
          return summary;
        } catch (err) {
          console.error(`[Summaries] Failed for "${article.title}":`, err);
          return { summary: "Summary unavailable.", keyTakeaways: [] };
        }
      })
    );

    for (let j = 0; j < batch.length; j++) {
      const idx = i + j;
      results[idx] = { ...results[idx], ...summaries[j] };
    }

    // Rate limit pause between batches (Groq free: ~30 req/min)
    if (i + BATCH_SIZE < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  return results;
}

async function fetchArticleContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (!res.ok) return "";

    const html = await res.text();
    const $ = cheerio.load(html);

    $("script, style, nav, footer, header, aside, .ad, .advertisement, .sidebar, .comments, .related, .share").remove();

    const selectors = ["article", "[role='main']", ".post-content", ".article-content", ".entry-content", ".markdown-body", "main", ".content", "#content", ".post", ".story"];
    let text = "";

    for (const selector of selectors) {
      const el = $(selector);
      if (el.length && el.text().trim().length > 100) {
        text = el.text().trim();
        break;
      }
    }

    if (!text || text.length < 100) {
      text = $("body").text().trim();
    }

    return text.replace(/\s+/g, " ").slice(0, 4000);
  } catch {
    return "";
  }
}

async function summarizeWithGroq(
  groq: Groq,
  title: string,
  content: string
): Promise<{ summary: string; keyTakeaways: string[] }> {
  // If we couldn't scrape enough content, ask LLM to summarize based on title alone
  if (!content || content.length < 50) {
    content = `(Article content unavailable - summarize based on title alone) Title: ${title}`;
  }

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: "You are a concise technical article summarizer." },
      {
        role: "user",
        content: `Summarize this article in 2-3 short paragraphs and provide 3-5 key takeaways.

Title: ${title}
Content: ${content}

Respond ONLY with valid JSON: {"summary": "...", "keyTakeaways": ["...", "..."]}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 768,
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content || "";
  const parsed = JSON.parse(text);
  return {
    summary: parsed.summary || "Summary unavailable.",
    keyTakeaways: parsed.keyTakeaways || [],
  };
}

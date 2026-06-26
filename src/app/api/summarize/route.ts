import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";
import { getArticleByUrl, updateArticleSummary } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { url, title } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Check if summary already exists in DB (checks both tables)
    const existing = await getArticleByUrl(url);
    if (existing?.summary) {
      return NextResponse.json({
        summary: existing.summary,
        keyTakeaways: existing.keyTakeaways || [],
        aiGenerated: true,
      });
    }

    // Determine which table this article belongs to
    const targetTable = existing?.table as "articles" | "popular_articles" || "articles";

    // Fetch the article content
    let articleText = "";
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      $("script, style, nav, footer, header, aside, .ad, .advertisement").remove();

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

      for (const selector of selectors) {
        const el = $(selector);
        if (el.length && el.text().trim().length > 100) {
          articleText = el.text().trim();
          break;
        }
      }

      if (!articleText || articleText.length < 100) {
        articleText = $("body").text().trim();
      }

      articleText = articleText
        .replace(/\s+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .slice(0, 6000);
    } catch {
      articleText = "";
    }

    // Log what we're working with
    console.log(`[Summarize] "${title}" — scraped ${articleText.length} chars, first 200: "${articleText.slice(0, 200)}..."`);

    // Generate summary with Groq
    const groqKey = process.env.GROQ_API_KEY;

    if (groqKey && articleText.length > 50) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a concise technical article summarizer." },
            {
              role: "user",
              content: `Summarize this article in 2-3 short paragraphs and provide 3-5 key takeaways.

Title: ${title}
Content: ${articleText}

Respond ONLY with valid JSON: {"summary": "...", "keyTakeaways": ["...", "..."]}`,
            },
          ],
          temperature: 0.3,
          max_tokens: 768,
          response_format: { type: "json_object" },
        });

        const text = completion.choices[0]?.message?.content || "";
        const parsed = JSON.parse(text);
        const summary = parsed.summary || "Summary unavailable.";
        const keyTakeaways = parsed.keyTakeaways || [];

        // Save to database for future requests (correct table)
        await updateArticleSummary(url, summary, keyTakeaways, targetTable);

        return NextResponse.json({ summary, keyTakeaways, aiGenerated: true });
      } catch (aiError) {
        console.error("Groq summarization failed:", aiError);
      }
    }

    // Fallback: extractive summary
    const sentences = articleText
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30 && s.length < 300);

    const summary =
      sentences.length > 0
        ? sentences.slice(0, 5).join(". ") + "."
        : `This article "${title}" covers software engineering topics. Visit the original link to read the full content.`;

    const keyTakeaways =
      sentences.length > 5
        ? sentences.slice(5, 10).map((s) => s.slice(0, 150))
        : ["Visit the original article for full details"];

    return NextResponse.json({ summary, keyTakeaways, aiGenerated: false });
  } catch (error) {
    console.error("Error summarizing:", error);
    return NextResponse.json(
      { error: "Failed to summarize article" },
      { status: 500 }
    );
  }
}

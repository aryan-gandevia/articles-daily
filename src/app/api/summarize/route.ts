import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";

export async function POST(request: NextRequest) {
  try {
    const { url, title } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Fetch the article content
    let articleText = "";
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();
      const $ = cheerio.load(html);

      // Remove scripts, styles, nav, footer
      $("script, style, nav, footer, header, aside, .ad, .advertisement").remove();

      // Try to get main content
      const selectors = [
        "article",
        "[role='main']",
        ".post-content",
        ".article-content",
        ".entry-content",
        "main",
        ".content",
      ];

      for (const selector of selectors) {
        const el = $(selector);
        if (el.length && el.text().trim().length > 200) {
          articleText = el.text().trim();
          break;
        }
      }

      // Fallback to body
      if (!articleText || articleText.length < 200) {
        articleText = $("body").text().trim();
      }

      // Clean up whitespace
      articleText = articleText
        .replace(/\s+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .slice(0, 6000); // Limit content for fast inference
    } catch {
      articleText = `Unable to fetch full article content for: ${title}`;
    }

    // Try Groq first (free, fast), then OpenAI, then fallback
    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const systemPrompt = "You are a technical article summarizer. Be concise and precise.";
    const userPrompt = `Summarize this article. Provide:
1. A concise summary (2-3 short paragraphs)
2. 3-5 key takeaways

Article title: ${title}
Article content: ${articleText}

Respond ONLY with valid JSON in this exact format:
{"summary": "...", "keyTakeaways": ["...", "..."]}`;

    if (groqKey) {
      try {
        const groq = new Groq({ apiKey: groqKey });
        const completion = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        });

        const text = completion.choices[0]?.message?.content || "";
        const parsed = JSON.parse(text);
        return NextResponse.json(parsed);
      } catch (groqError) {
        console.error("Groq summarization failed:", groqError);
      }
    }

    if (openaiKey) {
      try {
        const { generateText } = await import("ai");
        const { openai } = await import("@ai-sdk/openai");

        const { text } = await generateText({
          model: openai("gpt-4o-mini"),
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          maxRetries: 1,
        });

        const parsed = JSON.parse(text);
        return NextResponse.json(parsed);
      } catch (aiError) {
        console.error("OpenAI summarization failed:", aiError);
      }
    }

    // Fallback: generate a simple extractive summary
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
        : [
            "Visit the original article for full details",
            "Set GROQ_API_KEY in .env.local for free AI-powered summaries (console.groq.com)",
          ];

    return NextResponse.json({ summary, keyTakeaways });
  } catch (error) {
    console.error("Error summarizing:", error);
    return NextResponse.json(
      { error: "Failed to summarize article" },
      { status: 500 }
    );
  }
}

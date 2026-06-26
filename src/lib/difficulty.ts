import Groq from "groq-sdk";
import { Article } from "./types";

/**
 * Uses Groq LLM to score article difficulty based on title, description, tags, and source.
 * Processes articles in parallel batches to stay within rate limits.
 */
export async function scoreDifficultyWithLLM(articles: Article[]): Promise<Article[]> {
  const groqKey = process.env.GROQ_API_KEY;

  if (!groqKey) {
    console.warn("[Difficulty] No GROQ_API_KEY set, keeping heuristic scores");
    return articles;
  }

  const groq = new Groq({ apiKey: groqKey });

  // Batch all articles into a single LLM call for efficiency
  // This uses 1 API call instead of 30
  const articleDescriptions = articles.map((a, i) => {
    const tags = a.tags?.join(", ") || "none";
    return `${i + 1}. "${a.title}" [source: ${a.source}, tags: ${tags}]`;
  }).join("\n");

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a technical content difficulty assessor. Rate reading difficulty on a 1-10 scale where 1=absolute beginner (basic HTML tutorial), 5=intermediate (typical blog post), 10=expert-only (kernel internals, distributed consensus proofs).",
        },
        {
          role: "user",
          content: `Rate the reading difficulty (1-10) for each article based on its title, source, and tags. Consider the likely technical depth, prerequisite knowledge needed, and complexity of concepts.

Articles:
${articleDescriptions}

Respond ONLY with valid JSON: an array of numbers representing difficulty scores in order.
Example: [3, 7, 5, 8, 2, ...]`,
        },
      ],
      temperature: 0.2,
      max_tokens: 256,
      response_format: { type: "json_object" },
    });

    const text = completion.choices[0]?.message?.content || "";
    const parsed = JSON.parse(text);

    // Find the array of scores regardless of what key Groq used
    let scores: number[] = [];
    if (Array.isArray(parsed)) {
      scores = parsed;
    } else {
      // Search all values for the first array of numbers
      for (const value of Object.values(parsed)) {
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === "number") {
          scores = value as number[];
          break;
        }
      }
    }

    if (scores.length >= articles.length) {
      return articles.map((article, i) => ({
        ...article,
        difficultyScore: Math.min(10, Math.max(1, Math.round(scores[i]))),
      }));
    }

    console.warn(`[Difficulty] LLM returned ${scores.length} scores for ${articles.length} articles. Raw: ${text.slice(0, 200)}`);
    return articles;
  } catch (error) {
    console.error("[Difficulty] LLM scoring failed:", error);
    return articles;
  }
}

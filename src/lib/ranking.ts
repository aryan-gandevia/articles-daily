import { Article } from "./types";

/**
 * Scores article length on 1-10 scale (10 = longest) using real word count.
 * Linear scale: every ~500 words adds a point.
 */
function scoreLengthFromWordCount(wordCount: number): number {
  if (wordCount < 200) return 1;
  if (wordCount < 400) return 2;
  if (wordCount < 700) return 3;
  if (wordCount < 1000) return 4;
  if (wordCount < 1400) return 5;
  if (wordCount < 1900) return 6;
  if (wordCount < 2500) return 7;
  if (wordCount < 3200) return 8;
  if (wordCount < 4200) return 9;
  return 10;
}

/**
 * Calculates read time from word count.
 * Uses 238 wpm (average adult reading speed for technical content).
 */
function calculateReadTime(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 238));
}

/**
 * Scores content quality based on engagement signals
 */
function scoreContent(article: Article): number {
  let score = 5; // baseline

  // Boost for high engagement
  if (article.score) {
    if (article.score > 500) score += 3;
    else if (article.score > 200) score += 2;
    else if (article.score > 50) score += 1;
  }

  // Boost for having tags (indicates well-categorized)
  if (article.tags && article.tags.length > 2) score += 1;

  // Boost for InfoQ (typically high-quality editorial content)
  if (article.source === "infoq") score += 1;

  return Math.min(10, Math.max(1, score));
}

/**
 * Scores reading difficulty based on source and content signals
 */
function scoreDifficulty(article: Article): number {
  let score = 5;

  // Source-based difficulty
  switch (article.source) {
    case "github":
      score += 2; // Code repos are typically more advanced
      break;
    case "infoq":
      score += 1; // Enterprise/architecture topics
      break;
    case "stackoverflow":
      score += 1; // Technical Q&A
      break;
    case "dev":
      score -= 1; // Usually more beginner-friendly
      break;
  }

  // Tag-based difficulty indicators
  const advancedTags = [
    "rust",
    "systems",
    "compiler",
    "distributed",
    "kernel",
    "ml",
    "ai",
    "kubernetes",
    "architecture",
  ];
  const beginnerTags = [
    "tutorial",
    "beginners",
    "webdev",
    "css",
    "html",
    "javascript",
  ];

  if (article.tags) {
    const lowerTags = article.tags.map((t) => t.toLowerCase());
    if (lowerTags.some((t) => advancedTags.includes(t))) score += 2;
    if (lowerTags.some((t) => beginnerTags.includes(t))) score -= 2;
  }

  return Math.min(10, Math.max(1, score));
}

export function rankArticles(articles: Article[]): Article[] {
  return articles.map((article) => {
    // Use real word count if already enriched, otherwise estimate from DEV read time
    const wordCount = article.wordCount
      || (article.estimatedReadTime ? article.estimatedReadTime * 238 : 1000);
    const readTime = calculateReadTime(wordCount);

    return {
      ...article,
      wordCount,
      estimatedReadTime: readTime,
      lengthScore: scoreLengthFromWordCount(wordCount),
      contentScore: scoreContent(article),
      difficultyScore: scoreDifficulty(article),
    };
  });
}

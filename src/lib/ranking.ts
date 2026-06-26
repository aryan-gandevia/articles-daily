import { Article } from "./types";

/**
 * Estimates word count from title and description length.
 * In a real app, we'd fetch the actual article content.
 */
function estimateWordCount(article: Article): number {
  // Use existing read time if available (DEV.to provides this)
  if (article.estimatedReadTime) {
    return article.estimatedReadTime * 200; // avg 200 wpm
  }

  // Heuristic based on source type
  switch (article.source) {
    case "hackernews":
      return 1500; // HN links tend to be medium-length articles
    case "github":
      return 800; // README files are usually shorter
    case "infoq":
      return 2500; // InfoQ articles tend to be long-form
    case "dev":
      return 1200; // DEV articles vary but tend medium
    case "stackoverflow":
      return 600; // SO questions are usually shorter
    default:
      return 1000;
  }
}

/**
 * Scores article length on 1-10 scale (10 = longest)
 */
function scoreLengthFromWordCount(wordCount: number): number {
  // Scale: <300 = 1, 300-600 = 2-3, 600-1000 = 4-5, 1000-2000 = 6-7, 2000-3000 = 8-9, >3000 = 10
  if (wordCount < 300) return 1;
  if (wordCount < 600) return 3;
  if (wordCount < 1000) return 5;
  if (wordCount < 2000) return 7;
  if (wordCount < 3000) return 9;
  return 10;
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
    const wordCount = estimateWordCount(article);
    const readTime = Math.ceil(wordCount / 200);

    return {
      ...article,
      wordCount,
      estimatedReadTime: article.estimatedReadTime || readTime,
      lengthScore: scoreLengthFromWordCount(wordCount),
      contentScore: scoreContent(article),
      difficultyScore: scoreDifficulty(article),
    };
  });
}

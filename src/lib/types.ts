export type Source = "hackernews" | "github" | "infoq" | "dev" | "stackoverflow";

export interface Article {
  id: string;
  title: string;
  url: string;
  source: Source;
  author?: string;
  score?: number;
  publishedAt?: string;
  description?: string;
  tags?: string[];
  // Computed rankings
  lengthScore?: number; // 1-10 estimated reading time
  contentScore?: number; // 1-10 quality/relevance
  difficultyScore?: number; // 1-10 reading difficulty
  estimatedReadTime?: number; // minutes
  wordCount?: number;
}

export interface ArticleWithSummary extends Article {
  summary: string;
  keyTakeaways: string[];
}

export type SortCategory = "length" | "content" | "difficulty";

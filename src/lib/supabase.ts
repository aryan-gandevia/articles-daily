import { createClient } from "@supabase/supabase-js";
import { Article } from "./types";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database row type
interface ArticleRow {
  id: string;
  url: string;
  title: string;
  source: string;
  author: string | null;
  score: number | null;
  published_at: string | null;
  description: string | null;
  tags: string[] | null;
  word_count: number | null;
  estimated_read_time: number | null;
  length_score: number | null;
  content_score: number | null;
  difficulty_score: number | null;
  summary: string | null;
  key_takeaways: string[] | null;
  fetched_date: string;
  times_seen?: number;
  first_seen_date?: string;
  last_seen_date?: string;
}

// ─── Today's Articles ────────────────────────────────────────────────────────

/**
 * Get today's articles from the database.
 */
export async function getTodaysArticles(): Promise<Article[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("fetched_date", today)
    .order("content_score", { ascending: false });

  if (error) {
    console.error("[DB] Failed to fetch articles:", error);
    return [];
  }

  return (data as ArticleRow[]).map(rowToArticle);
}

/**
 * Get all existing URLs from the articles table (used by cron to detect repeats).
 */
export async function getAllArticleUrls(): Promise<string[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("url");

  if (error) {
    console.error("[DB] Failed to fetch article URLs:", error);
    return [];
  }

  return (data || []).map((row: { url: string }) => row.url);
}

/**
 * Atomically refresh the articles and popular_articles tables.
 * Uses a PostgreSQL function for ACID compliance.
 */
export async function replaceArticles(
  articles: Article[],
  repeats: Article[]
): Promise<void> {
  const newArticlesJson = articles.map((a) => ({
    url: a.url,
    title: a.title,
    source: a.source,
    author: a.author || null,
    score: a.score || null,
    publishedAt: a.publishedAt || null,
    description: a.description || null,
    tags: a.tags || null,
    wordCount: a.wordCount || null,
    estimatedReadTime: a.estimatedReadTime || null,
    lengthScore: a.lengthScore || null,
    contentScore: a.contentScore || null,
    difficultyScore: a.difficultyScore || null,
    summary: a.summary || null,
    keyTakeaways: a.keyTakeaways || null,
  }));

  const repeatsJson = repeats.map((a) => ({
    url: a.url,
    title: a.title,
    source: a.source,
    author: a.author || null,
    score: a.score || null,
    publishedAt: a.publishedAt || null,
    description: a.description || null,
    tags: a.tags || null,
    wordCount: a.wordCount || null,
    estimatedReadTime: a.estimatedReadTime || null,
    lengthScore: a.lengthScore || null,
    contentScore: a.contentScore || null,
    difficultyScore: a.difficultyScore || null,
    summary: a.summary || null,
    keyTakeaways: a.keyTakeaways || null,
  }));

  const { error } = await supabase.rpc("refresh_daily_articles", {
    new_articles: newArticlesJson,
    repeats: repeatsJson,
  });

  if (error) {
    console.error("[DB] Failed to refresh daily articles:", error);
    throw error;
  }
}

/**
 * Update a single article's summary in the specified table.
 */
export async function updateArticleSummary(
  url: string,
  summary: string,
  keyTakeaways: string[],
  table: "articles" | "popular_articles" = "articles"
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update({ summary, key_takeaways: keyTakeaways })
    .eq("url", url);

  if (error) {
    console.error(`[DB] Failed to update summary in ${table}:`, error);
  }
}

/**
 * Get a single article by URL, checking both tables.
 */
export async function getArticleByUrl(url: string): Promise<(Article & { table: string }) | null> {
  // Check articles table first
  const { data: articleData } = await supabase
    .from("articles")
    .select("*")
    .eq("url", url)
    .single();

  if (articleData) {
    return { ...rowToArticle(articleData as ArticleRow), table: "articles" };
  }

  // Check popular_articles table
  const { data: popularData } = await supabase
    .from("popular_articles")
    .select("*")
    .eq("url", url)
    .single();

  if (popularData) {
    return { ...rowToArticle(popularData as ArticleRow), table: "popular_articles" };
  }

  return null;
}

// ─── Popular Articles ────────────────────────────────────────────────────────

/**
 * Get all popular articles, sorted by times_seen.
 */
export async function getPopularArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("popular_articles")
    .select("*")
    .order("times_seen", { ascending: false });

  if (error) {
    console.error("[DB] Failed to fetch popular articles:", error);
    return [];
  }

  return (data as ArticleRow[]).map(rowToArticle);
}

/**
 * Get all URLs from the popular_articles table.
 */
export async function getPopularArticleUrls(): Promise<string[]> {
  const { data, error } = await supabase
    .from("popular_articles")
    .select("url");

  if (error) {
    console.error("[DB] Failed to fetch popular article URLs:", error);
    return [];
  }

  return (data || []).map((row: { url: string }) => row.url);
}

// ─── Application Logging ───────────────────────────────────────────────────────

export async function logAppEvent(
  level: "info" | "warn" | "error",
  source: string,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("app_logs").insert({
    level,
    source,
    message,
    metadata: metadata || null,
  });

  if (error) {
    console.error("[Logger] Failed to write log:", error);
  }
}

// ─── Subscribers ───────────────────────────────────────────────────────────────

/**
 * Get all users subscribed to the daily digest email.
 */
export async function getSubscribers(): Promise<{ email: string; username: string }[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username, email")
    .eq("notifications_enabled", true)
    .not("email", "is", null);

  if (error) {
    console.error("[DB] Failed to fetch subscribers:", error);
    return [];
  }

  return (data || [])
    .filter((row): row is { username: string; email: string } => !!row.email && !!row.username)
    .map((row) => ({ email: row.email, username: row.username }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rowToArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    source: row.source as Article["source"],
    author: row.author || undefined,
    score: row.score || undefined,
    publishedAt: row.published_at || undefined,
    description: row.description || undefined,
    tags: row.tags || undefined,
    wordCount: row.word_count || undefined,
    estimatedReadTime: row.estimated_read_time || undefined,
    lengthScore: row.length_score || undefined,
    contentScore: row.content_score || undefined,
    difficultyScore: row.difficulty_score || undefined,
    summary: row.summary || undefined,
    keyTakeaways: row.key_takeaways || undefined,
  };
}

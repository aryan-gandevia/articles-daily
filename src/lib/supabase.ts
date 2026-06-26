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
 * Wipe the articles table and insert fresh articles for today.
 */
export async function replaceArticles(articles: Article[]): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Delete ALL rows from articles table
  const { error: deleteError } = await supabase
    .from("articles")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // deletes all rows

  if (deleteError) {
    console.error("[DB] Failed to clear articles table:", deleteError);
  }

  // Insert fresh articles
  const rows = articles.map((a) => ({
    url: a.url,
    title: a.title,
    source: a.source,
    author: a.author || null,
    score: a.score || null,
    published_at: a.publishedAt || null,
    description: a.description || null,
    tags: a.tags || null,
    word_count: a.wordCount || null,
    estimated_read_time: a.estimatedReadTime || null,
    length_score: a.lengthScore || null,
    content_score: a.contentScore || null,
    difficulty_score: a.difficultyScore || null,
    summary: a.summary || null,
    key_takeaways: a.keyTakeaways || null,
    fetched_date: today,
  }));

  const { error: insertError } = await supabase
    .from("articles")
    .insert(rows);

  if (insertError) {
    console.error("[DB] Failed to insert articles:", insertError);
    throw insertError;
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

/**
 * Upsert articles into popular_articles table.
 * If already exists, increment times_seen and update last_seen_date.
 */
export async function upsertPopularArticles(articles: Article[]): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  for (const article of articles) {
    // Check if already in popular_articles
    const { data: existing } = await supabase
      .from("popular_articles")
      .select("times_seen")
      .eq("url", article.url)
      .single();

    if (existing) {
      // Increment times_seen
      await supabase
        .from("popular_articles")
        .update({
          times_seen: (existing.times_seen || 2) + 1,
          last_seen_date: today,
          score: article.score || null,
          content_score: article.contentScore || null,
        })
        .eq("url", article.url);
    } else {
      // Insert new popular article
      await supabase
        .from("popular_articles")
        .insert({
          url: article.url,
          title: article.title,
          source: article.source,
          author: article.author || null,
          score: article.score || null,
          published_at: article.publishedAt || null,
          description: article.description || null,
          tags: article.tags || null,
          word_count: article.wordCount || null,
          estimated_read_time: article.estimatedReadTime || null,
          length_score: article.lengthScore || null,
          content_score: article.contentScore || null,
          difficulty_score: article.difficultyScore || null,
          summary: article.summary || null,
          key_takeaways: article.keyTakeaways || null,
          times_seen: 2,
          first_seen_date: today,
          last_seen_date: today,
        });
    }
  }
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

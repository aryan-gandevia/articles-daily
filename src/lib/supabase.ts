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
}

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
 * Clear today's articles and insert fresh ones.
 */
export async function replaceArticles(articles: Article[]): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  // Delete today's articles
  const { error: deleteError } = await supabase
    .from("articles")
    .delete()
    .eq("fetched_date", today);

  if (deleteError) {
    console.error("[DB] Failed to delete old articles:", deleteError);
  }

  // Insert new articles
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
 * Update a single article's summary in the database.
 */
export async function updateArticleSummary(
  url: string,
  summary: string,
  keyTakeaways: string[]
): Promise<void> {
  const { error } = await supabase
    .from("articles")
    .update({ summary, key_takeaways: keyTakeaways })
    .eq("url", url);

  if (error) {
    console.error("[DB] Failed to update summary:", error);
  }
}

/**
 * Get a single article by URL.
 */
export async function getArticleByUrl(url: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("url", url)
    .single();

  if (error || !data) return null;
  return rowToArticle(data as ArticleRow);
}

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

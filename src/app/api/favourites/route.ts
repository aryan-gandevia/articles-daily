import { NextRequest, NextResponse } from "next/server";
import { supabase, logAppEvent } from "@/lib/supabase";
import { Article } from "@/lib/types";

// Helper to get user ID from session cookie
async function getUserId(request: NextRequest): Promise<string | null> {
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) return null;

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) return null;
  return user.id;
}

// GET: Get user's favourited articles
export async function GET(request: NextRequest) {
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's favourited article URLs
  const { data: userFavs, error: favsError } = await supabase
    .from("user_favourites")
    .select("article_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (favsError || !userFavs || userFavs.length === 0) {
    return NextResponse.json({ articles: [], count: 0 });
  }

  // Get the actual article data
  const urls = userFavs.map((f) => f.article_url);
  const { data: articles, error: articlesError } = await supabase
    .from("favourited_articles")
    .select("*")
    .in("url", urls);

  if (articlesError) {
    await logAppEvent("error", "api-favourites", "Failed to fetch favourited articles", {
      error: articlesError.message,
      userId,
    });
    return NextResponse.json({ error: "Failed to fetch favourites" }, { status: 500 });
  }

  // Map to Article type and maintain user's order
  const articleMap = new Map(articles?.map((a) => [a.url, a]) || []);
  const orderedArticles = urls
    .map((url) => articleMap.get(url))
    .filter(Boolean)
    .map((row) => rowToArticle(row));

  return NextResponse.json({
    articles: orderedArticles,
    count: orderedArticles.length,
  });
}

// POST: Add article to favourites
export async function POST(request: NextRequest) {
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { article, confirmEviction } = await request.json() as {
    article: Article;
    confirmEviction?: boolean;
  };

  if (!article?.url) {
    return NextResponse.json({ error: "Article URL is required" }, { status: 400 });
  }

  // Check current count
  const { count, error: countError } = await supabase
    .from("user_favourites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    await logAppEvent("error", "api-favourites", "Failed to check favourites count", {
      error: countError.message,
      userId,
    });
    return NextResponse.json({ error: "Failed to check favourites count" }, { status: 500 });
  }

  const currentCount = count || 0;

  // If at 50 and no eviction confirmation, ask for confirmation
  if (currentCount >= 50 && !confirmEviction) {
    return NextResponse.json({
      error: "limit_reached",
      message: "You have 50 favourited articles. Adding this will remove your oldest favourite.",
      currentCount,
    }, { status: 409 });
  }

  // If at 50 and confirmed, evict the oldest
  if (currentCount >= 50 && confirmEviction) {
    const { data: oldest } = await supabase
      .from("user_favourites")
      .select("id, article_url")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (oldest) {
      await supabase
        .from("user_favourites")
        .delete()
        .eq("id", oldest.id);

      // Decrement favourited_count on the article
      await supabase.rpc("decrement_favourite_count", { article_url_param: oldest.article_url });
    }
  }

  // Upsert article into favourited_articles (stores it once)
  const { error: upsertError } = await supabase
    .from("favourited_articles")
    .upsert({
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
    }, { onConflict: "url" });

  if (upsertError) {
    console.error("[Favourites] Failed to upsert article:", upsertError);
    await logAppEvent("error", "api-favourites", "Failed to upsert favourited article", {
      error: upsertError.message,
      userId,
      url: article.url,
    });
    return NextResponse.json({ error: "Failed to save article" }, { status: 500 });
  }

  // Add user_favourites mapping and increment count atomically
  const { data: beforeRow } = await supabase
    .from("favourited_articles")
    .select("favourited_count")
    .eq("url", article.url)
    .single();
  console.log("[Favourites] Count before add:", beforeRow?.favourited_count, "for", article.url);

  const { data: inserted, error: favError } = await supabase.rpc("add_favourite", {
    user_id_param: userId,
    article_url_param: article.url,
  });

  if (favError) {
    console.error("[Favourites] Failed to add favourite:", favError);
    await logAppEvent("error", "api-favourites", "Failed to add favourite mapping", {
      error: favError.message,
      userId,
      url: article.url,
    });
    return NextResponse.json({ error: "Failed to favourite" }, { status: 500 });
  }

  if (!inserted) {
    return NextResponse.json({ error: "Already favourited" }, { status: 409 });
  }

  const { data: afterRow } = await supabase
    .from("favourited_articles")
    .select("favourited_count")
    .eq("url", article.url)
    .single();
  console.log("[Favourites] Count after add:", afterRow?.favourited_count, "for", article.url);

  return NextResponse.json({ success: true, count: currentCount + 1 });
}

// DELETE: Remove article from favourites
export async function DELETE(request: NextRequest) {
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "Article URL is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_favourites")
    .delete()
    .eq("user_id", userId)
    .eq("article_url", url);

  if (error) {
    await logAppEvent("error", "api-favourites", "Failed to remove favourite", {
      error: error.message,
      userId,
      url,
    });
    return NextResponse.json({ error: "Failed to remove favourite" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Helper to convert DB row to Article type
function rowToArticle(row: Record<string, unknown>): Article {
  return {
    id: row.id as string,
    url: row.url as string,
    title: row.title as string,
    source: row.source as Article["source"],
    author: (row.author as string) || undefined,
    score: (row.score as number) || undefined,
    publishedAt: (row.published_at as string) || undefined,
    description: (row.description as string) || undefined,
    tags: (row.tags as string[]) || undefined,
    wordCount: (row.word_count as number) || undefined,
    estimatedReadTime: (row.estimated_read_time as number) || undefined,
    lengthScore: (row.length_score as number) || undefined,
    contentScore: (row.content_score as number) || undefined,
    difficultyScore: (row.difficulty_score as number) || undefined,
    summary: (row.summary as string) || undefined,
    keyTakeaways: (row.key_takeaways as string[]) || undefined,
  };
}

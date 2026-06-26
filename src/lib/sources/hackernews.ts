import { Article } from "../types";
import { logAppEvent } from "../supabase";

interface HNItem {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants?: number;
}

export async function fetchHackerNews(): Promise<Article[]> {
  try {
    const res = await fetch(
      "https://hacker-news.firebaseio.com/v0/topstories.json"
    );
    const ids: number[] = await res.json();

    // Get top 15 stories
    const stories = await Promise.all(
      ids.slice(0, 15).map(async (id) => {
        const itemRes = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );
        return itemRes.json() as Promise<HNItem>;
      })
    );

    return stories
      .filter((item) => item.url) // Only items with external URLs
      .map((item) => ({
        id: `hn-${item.id}`,
        title: item.title,
        url: item.url!,
        source: "hackernews" as const,
        author: item.by,
        score: item.score,
        publishedAt: new Date(item.time * 1000).toISOString(),
        description: `${item.score} points | ${item.descendants ?? 0} comments`,
      }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching Hacker News:", error);
    await logAppEvent("error", "source-hackernews", "Failed to fetch Hacker News", {
      error: errorMessage,
    });
    return [];
  }
}

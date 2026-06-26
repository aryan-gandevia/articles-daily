import { Article } from "../types";
import { logAppEvent } from "../supabase";

interface SOQuestion {
  question_id: number;
  title: string;
  link: string;
  owner: { display_name: string };
  score: number;
  creation_date: number;
  tags: string[];
  answer_count: number;
  view_count: number;
}

export async function fetchStackOverflow(): Promise<Article[]> {
  try {
    const res = await fetch(
      "https://api.stackexchange.com/2.3/questions?order=desc&sort=hot&site=stackoverflow&pagesize=10&filter=default"
    );
    const data = await res.json();

    if (!data.items) return [];

    return data.items.map((q: SOQuestion) => ({
      id: `so-${q.question_id}`,
      title: q.title,
      url: q.link,
      source: "stackoverflow" as const,
      author: q.owner.display_name,
      score: q.score,
      publishedAt: new Date(q.creation_date * 1000).toISOString(),
      description: `${q.answer_count} answers | ${q.view_count} views`,
      tags: q.tags.slice(0, 5),
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error fetching Stack Overflow:", error);
    await logAppEvent("error", "source-stackoverflow", "Failed to fetch Stack Overflow", {
      error: errorMessage,
    });
    return [];
  }
}

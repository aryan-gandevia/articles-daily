import { Article } from "../types";

interface DevArticle {
  id: number;
  title: string;
  url: string;
  user: { username: string };
  published_at: string;
  positive_reactions_count: number;
  reading_time_minutes: number;
  description: string;
  tag_list: string[];
}

export async function fetchDevArticles(): Promise<Article[]> {
  try {
    const res = await fetch(
      "https://dev.to/api/articles?top=1&per_page=10"
    );
    const articles: DevArticle[] = await res.json();

    return articles.map((article) => ({
      id: `dev-${article.id}`,
      title: article.title,
      url: article.url,
      source: "dev" as const,
      author: article.user.username,
      score: article.positive_reactions_count,
      publishedAt: article.published_at,
      description: article.description,
      tags: article.tag_list,
      estimatedReadTime: article.reading_time_minutes,
    }));
  } catch (error) {
    console.error("Error fetching DEV.to:", error);
    return [];
  }
}

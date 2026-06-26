import { Article } from "../types";

interface GitHubRepo {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  owner: { login: string };
  topics: string[];
  created_at: string;
}

export async function fetchGitHubTrending(): Promise<Article[]> {
  try {
    // GitHub doesn't have an official trending API, use search for repos created/updated recently with high stars
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const dateStr = since.toISOString().split("T")[0];

    const res = await fetch(
      `https://api.github.com/search/repositories?q=created:>${dateStr}+language:typescript+language:python+language:rust+language:go&sort=stars&order=desc&per_page=10`,
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    const data = await res.json();

    if (!data.items) return [];

    return data.items.map((repo: GitHubRepo) => ({
      id: `gh-${repo.id}`,
      title: repo.full_name,
      url: repo.html_url,
      source: "github" as const,
      author: repo.owner.login,
      score: repo.stargazers_count,
      publishedAt: repo.created_at,
      description: repo.description || "No description",
      tags: [repo.language, ...repo.topics.slice(0, 3)].filter(Boolean) as string[],
    }));
  } catch (error) {
    console.error("Error fetching GitHub:", error);
    return [];
  }
}

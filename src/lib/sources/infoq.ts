import { Article } from "../types";

export async function fetchInfoQ(): Promise<Article[]> {
  try {
    // InfoQ doesn't have a public API, so we'll use their RSS feed via a proxy approach
    // Fetching from their feed endpoint
    const res = await fetch("https://feed.infoq.com/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ArticlesDaily/1.0)",
      },
    });
    const text = await res.text();

    // Parse RSS XML manually
    const articles: Article[] = [];
    const items = text.split("<item>").slice(1); // Skip header

    for (let i = 0; i < Math.min(items.length, 10); i++) {
      const item = items[i];
      const title = extractXMLTag(item, "title");
      const link = extractXMLTag(item, "link");
      const description = extractXMLTag(item, "description");
      const pubDate = extractXMLTag(item, "pubDate");
      const creator = extractXMLTag(item, "dc:creator");

      if (title && link) {
        articles.push({
          id: `infoq-${i}-${Buffer.from(link).toString("base64url").slice(-16)}`,
          title: cleanHtml(title),
          url: link,
          source: "infoq",
          author: creator || "InfoQ",
          publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
          description: cleanHtml(description || "").slice(0, 200),
        });
      }
    }

    return articles;
  } catch (error) {
    console.error("Error fetching InfoQ:", error);
    return [];
  }
}

function extractXMLTag(xml: string, tag: string): string | null {
  // Handle CDATA sections
  const cdataRegex = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`);
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function cleanHtml(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, "")
    .trim();
}

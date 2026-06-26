import { Article } from "./types";

interface CachedDigest {
  articles: Article[];
  generatedAt: string;
  sources: Record<string, number>;
}

// Global in-memory cache — persists across requests on the same server instance
// Resets on cold start (Vercel spins down after ~5-15 min of inactivity)
let cachedDigest: CachedDigest | null = null;

export function getCachedDigest(): CachedDigest | null {
  if (!cachedDigest) return null;

  // Check if cache is from today (local server time)
  const cachedDate = new Date(cachedDigest.generatedAt).toDateString();
  const today = new Date().toDateString();
  if (cachedDate !== today) return null; // stale, from yesterday

  return cachedDigest;
}

export function setCachedDigest(digest: CachedDigest): void {
  cachedDigest = digest;
}

export function isCachePopulated(): boolean {
  return getCachedDigest() !== null;
}

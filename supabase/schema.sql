-- Articles table for daily digest (wiped and refreshed each day)
CREATE TABLE IF NOT EXISTS articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  author TEXT,
  score INTEGER,
  published_at TIMESTAMPTZ,
  description TEXT,
  tags TEXT[],
  word_count INTEGER,
  estimated_read_time INTEGER,
  length_score INTEGER,
  content_score INTEGER,
  difficulty_score INTEGER,
  summary TEXT,
  key_takeaways TEXT[],
  fetched_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast daily queries
CREATE INDEX IF NOT EXISTS idx_articles_fetched_date ON articles(fetched_date DESC);

-- Disable RLS since we only access from server-side with service_role key
ALTER TABLE articles DISABLE ROW LEVEL SECURITY;

-- Popular articles table (articles that appear multiple times across days)
-- Run this in SQL Editor if not already created
CREATE TABLE IF NOT EXISTS popular_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  author TEXT,
  score INTEGER,
  published_at TIMESTAMPTZ,
  description TEXT,
  tags TEXT[],
  word_count INTEGER,
  estimated_read_time INTEGER,
  length_score INTEGER,
  content_score INTEGER,
  difficulty_score INTEGER,
  summary TEXT,
  key_takeaways TEXT[],
  times_seen INTEGER DEFAULT 2,
  first_seen_date DATE NOT NULL,
  last_seen_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for sorting by popularity
CREATE INDEX IF NOT EXISTS idx_popular_articles_times_seen ON popular_articles(times_seen DESC);

-- Disable RLS
ALTER TABLE popular_articles DISABLE ROW LEVEL SECURITY;

-- ─── Favourites ──────────────────────────────────────────────────────────────

-- Stores article data once, shared across all users who favourite it
CREATE TABLE IF NOT EXISTS favourited_articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  author TEXT,
  score INTEGER,
  published_at TIMESTAMPTZ,
  description TEXT,
  tags TEXT[],
  word_count INTEGER,
  estimated_read_time INTEGER,
  length_score INTEGER,
  content_score INTEGER,
  difficulty_score INTEGER,
  summary TEXT,
  key_takeaways TEXT[],
  favourited_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE favourited_articles DISABLE ROW LEVEL SECURITY;

-- Maps user -> favourited article (max 50 per user, enforced in app logic)
CREATE TABLE IF NOT EXISTS user_favourites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_url TEXT NOT NULL REFERENCES favourited_articles(url) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, article_url)
);

CREATE INDEX IF NOT EXISTS idx_user_favourites_user ON user_favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favourites_created ON user_favourites(user_id, created_at ASC);

ALTER TABLE user_favourites DISABLE ROW LEVEL SECURITY;

-- ─── User Profiles ───────────────────────────────────────────────────────────

-- Stores username, optional email, notification preferences
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  notifications_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- ─── Feedback Rate Limiting ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feedback_rate_limits ADD CONSTRAINT IF NOT EXISTS feedback_rate_limits_user_id_key UNIQUE (user_id);
ALTER TABLE feedback_rate_limits ADD CONSTRAINT IF NOT EXISTS feedback_rate_limits_ip_address_key UNIQUE (ip_address);

ALTER TABLE feedback_rate_limits DISABLE ROW LEVEL SECURITY;

-- ─── Application Logs ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_logs_source ON app_logs(source);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at DESC);

ALTER TABLE app_logs DISABLE ROW LEVEL SECURITY;

-- ─── Atomic Cron Refresh Function ──────────────────────────────────────────────

-- Refreshes daily articles and popular articles in a single ACID transaction.
-- new_articles: array of article objects to insert into the articles table
-- repeats: array of article objects that appeared on a previous day (upserted to popular_articles)
CREATE OR REPLACE FUNCTION refresh_daily_articles(
  new_articles JSONB,
  repeats JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  today DATE := CURRENT_DATE;
  repeat_article JSONB;
  new_article JSONB;
BEGIN
  -- All operations below happen in a single transaction

  -- 1. Wipe the articles table
  DELETE FROM articles;

  -- 2. Insert fresh articles
  INSERT INTO articles (
    url,
    title,
    source,
    author,
    score,
    published_at,
    description,
    tags,
    word_count,
    estimated_read_time,
    length_score,
    content_score,
    difficulty_score,
    summary,
    key_takeaways,
    fetched_date
  )
  SELECT
    (a->>'url')::TEXT,
    (a->>'title')::TEXT,
    (a->>'source')::TEXT,
    (a->>'author')::TEXT,
    (a->>'score')::INTEGER,
    (a->>'publishedAt')::TIMESTAMPTZ,
    (a->>'description')::TEXT,
    (a->'tags')::TEXT[],
    (a->>'wordCount')::INTEGER,
    (a->>'estimatedReadTime')::INTEGER,
    (a->>'lengthScore')::INTEGER,
    (a->>'contentScore')::INTEGER,
    (a->>'difficultyScore')::INTEGER,
    (a->>'summary')::TEXT,
    (a->'keyTakeaways')::TEXT[],
    today
  FROM jsonb_array_elements(new_articles) AS a;

  -- 3. Upsert repeats into popular_articles
  FOR repeat_article IN SELECT * FROM jsonb_array_elements(repeats)
  LOOP
    INSERT INTO popular_articles (
      url,
      title,
      source,
      author,
      score,
      published_at,
      description,
      tags,
      word_count,
      estimated_read_time,
      length_score,
      content_score,
      difficulty_score,
      summary,
      key_takeaways,
      times_seen,
      first_seen_date,
      last_seen_date
    )
    VALUES (
      (repeat_article->>'url')::TEXT,
      (repeat_article->>'title')::TEXT,
      (repeat_article->>'source')::TEXT,
      (repeat_article->>'author')::TEXT,
      (repeat_article->>'score')::INTEGER,
      (repeat_article->>'publishedAt')::TIMESTAMPTZ,
      (repeat_article->>'description')::TEXT,
      (repeat_article->'tags')::TEXT[],
      (repeat_article->>'wordCount')::INTEGER,
      (repeat_article->>'estimatedReadTime')::INTEGER,
      (repeat_article->>'lengthScore')::INTEGER,
      (repeat_article->>'contentScore')::INTEGER,
      (repeat_article->>'difficultyScore')::INTEGER,
      (repeat_article->>'summary')::TEXT,
      (repeat_article->'keyTakeaways')::TEXT[],
      2,
      today,
      today
    )
    ON CONFLICT (url) DO UPDATE SET
      times_seen = popular_articles.times_seen + 1,
      last_seen_date = today,
      score = EXCLUDED.score,
      content_score = EXCLUDED.content_score;
  END LOOP;
END;
$$;

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
  favourited_count INTEGER DEFAULT 0,
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

-- Increment favourited_count
CREATE OR REPLACE FUNCTION increment_favourite_count(article_url_param TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE favourited_articles
  SET favourited_count = COALESCE(favourited_count, 0) + 1
  WHERE url = article_url_param;
END;
$$ LANGUAGE plpgsql;

-- Atomically add a favourite and increment count, returning whether it was inserted
CREATE OR REPLACE FUNCTION add_favourite(user_id_param UUID, article_url_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  inserted BOOLEAN;
BEGIN
  INSERT INTO user_favourites (user_id, article_url)
  VALUES (user_id_param, article_url_param)
  ON CONFLICT (user_id, article_url) DO NOTHING
  RETURNING TRUE INTO inserted;

  IF inserted THEN
    PERFORM increment_favourite_count(article_url_param);
  END IF;

  RETURN COALESCE(inserted, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Decrement favourited_count and remove article if no likes remain
CREATE OR REPLACE FUNCTION decrement_favourite_count(article_url_param TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE favourited_articles
  SET favourited_count = GREATEST(favourited_count - 1, 0)
  WHERE url = article_url_param;

  -- Only delete the article if no user_favourites rows reference it anymore.
  -- This avoids cascade conflicts during bulk deletes (e.g. account deletion).
  DELETE FROM favourited_articles
  WHERE url = article_url_param
    AND NOT EXISTS (SELECT 1 FROM user_favourites WHERE article_url = article_url_param);
END;
$$ LANGUAGE plpgsql;

-- Trigger: when a user_favourites row is deleted, decrement and clean up
CREATE OR REPLACE FUNCTION trg_user_favourites_deleted()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.decrement_favourite_count(OLD.article_url);
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'trg_user_favourites_deleted failed for %: %', OLD.article_url, SQLERRM;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_favourites_deleted ON user_favourites;
CREATE TRIGGER trg_user_favourites_deleted
AFTER DELETE ON user_favourites
FOR EACH ROW
EXECUTE FUNCTION trg_user_favourites_deleted();

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'feedback_rate_limits_user_id_key'
  ) THEN
    ALTER TABLE feedback_rate_limits
      ADD CONSTRAINT feedback_rate_limits_user_id_key UNIQUE (user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'feedback_rate_limits_ip_address_key'
  ) THEN
    ALTER TABLE feedback_rate_limits
      ADD CONSTRAINT feedback_rate_limits_ip_address_key UNIQUE (ip_address);
  END IF;
END $$;

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
  DELETE FROM articles WHERE TRUE;

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
    CASE WHEN jsonb_typeof(a->'tags') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(a->'tags')) ELSE NULL END,
    (a->>'wordCount')::INTEGER,
    (a->>'estimatedReadTime')::INTEGER,
    (a->>'lengthScore')::INTEGER,
    (a->>'contentScore')::INTEGER,
    (a->>'difficultyScore')::INTEGER,
    (a->>'summary')::TEXT,
    CASE WHEN jsonb_typeof(a->'keyTakeaways') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(a->'keyTakeaways')) ELSE NULL END,
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
      CASE WHEN jsonb_typeof(repeat_article->'tags') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(repeat_article->'tags')) ELSE NULL END,
      (repeat_article->>'wordCount')::INTEGER,
      (repeat_article->>'estimatedReadTime')::INTEGER,
      (repeat_article->>'lengthScore')::INTEGER,
      (repeat_article->>'contentScore')::INTEGER,
      (repeat_article->>'difficultyScore')::INTEGER,
      (repeat_article->>'summary')::TEXT,
      CASE WHEN jsonb_typeof(repeat_article->'keyTakeaways') = 'array' THEN ARRAY(SELECT jsonb_array_elements_text(repeat_article->'keyTakeaways')) ELSE NULL END,
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

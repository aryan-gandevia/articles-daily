-- Articles table for daily digest
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

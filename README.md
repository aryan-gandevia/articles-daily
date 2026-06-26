# Articles Daily

A beautiful, minimalistic daily software engineering article digest. Curates content from 5 major sources and ranks articles by quality, length, and difficulty.

## Sources

- **Hacker News** — Top stories from the HN front page
- **GitHub** — Trending repositories (TypeScript, Python, Rust, Go)
- **DEV.to** — Top community articles
- **InfoQ** — Enterprise software engineering articles
- **Stack Overflow** — Hot questions

## Features

- Fetches and aggregates articles from all 5 sources on startup
- Ranks articles by 3 categories: Content Quality, Length, and Read Difficulty
- Filter by source
- Click any article for an AI-powered summary with key takeaways
- Direct link to original article
- Smooth animations and elegant, distraction-free reading experience

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## AI Summaries (Optional)

For AI-powered summaries using GPT-4o-mini, set your OpenAI API key:

```bash
# .env.local
OPENAI_API_KEY=sk-your-key-here
```

Without this key, the app falls back to extractive summaries parsed from the article HTML.

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** for animations
- **Vercel AI SDK** for AI summaries (optional)
- **Cheerio** for HTML parsing

## Architecture

```
src/
├── app/
│   ├── api/
│   │   ├── articles/route.ts    # Fetches from all 5 sources
│   │   └── summarize/route.ts   # AI summary endpoint
│   ├── page.tsx                  # Main feed page
│   └── layout.tsx
├── components/
│   ├── ArticleCard.tsx           # Individual article card
│   ├── ArticleModal.tsx          # Summary modal overlay
│   ├── FilterBar.tsx             # Source & sort filters
│   ├── Header.tsx                # App header with date
│   └── LoadingState.tsx          # Loading spinner
└── lib/
    ├── types.ts                  # TypeScript types
    ├── ranking.ts                # Article scoring logic
    └── sources/                  # Data fetchers
        ├── hackernews.ts
        ├── github.ts
        ├── dev.ts
        ├── infoq.ts
        └── stackoverflow.ts
```

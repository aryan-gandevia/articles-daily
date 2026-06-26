# Articles Daily

Daily software engineering article digest.

## Sources

- **Hacker News** — Top stories from the HN front page
- **GitHub** — Trending repositories (TypeScript, Python, Rust, Go)
- **DEV.to** — Top community articles
- **InfoQ** — Enterprise software engineering articles
- **Stack Overflow** — Hot questions

## Features

- Cron job to fetch new articles daily
- Ranks articles by 3 categories: Content Quality, Length, and Read Difficulty
- Filter by source
- Click any article for an AI-powered summary with key takeaways
- Direct link to original article

## Tech Stack

- **Next.js 16** with App Router
- **TypeScript**
- **Tailwind CSS v4**
- **Framer Motion** for animations
- **Groq API** for AI summaries
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

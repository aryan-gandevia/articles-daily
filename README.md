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

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase (required for database + auth)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Cron job secret (required for /api/cron/generate)
CRON_SECRET=any-random-secret

# App URL (used in emails and cron)
APP_URL=https://your-app.vercel.app

# AI summaries (optional)
GROQ_API_KEY=gsk-your-key-here

# Email digest (optional)
RESEND_API_KEY=re_your-key-here
FROM_EMAIL=onboarding@resend.dev

# Feedback recipient email (optional)
FEEDBACK_EMAIL=aryan.gandevia@gmail.com
```

### Email Digest Setup

1. Sign up at [resend.com](https://resend.com)
2. Create an API key and add it as `RESEND_API_KEY`
3. For testing, use `FROM_EMAIL=onboarding@resend.dev` (only sends to your own email)
4. For production, verify a domain in Resend and use something like `noreply@yourdomain.com`

### Feedback Setup

1. Set `FEEDBACK_EMAIL` to the address where you want to receive feedback
2. If not set, feedback defaults to `aryan.gandevia@gmail.com`
3. Users are rate limited to 1 feedback submission every 5 minutes

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

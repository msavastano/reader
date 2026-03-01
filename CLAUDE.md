# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Production build
npm run lint     # Run ESLint

# Database (Drizzle Kit)
npx drizzle-kit generate   # Generate SQL migrations from schema changes
npx drizzle-kit migrate    # Apply migrations to the database
npx drizzle-kit push       # Push schema directly without migration files (dev only)
npx drizzle-kit studio     # Open Drizzle Studio GUI

# Playwright E2E tests (requires dev server running or webServer config auto-starts it)
npx playwright test                          # Run all tests (Chromium + Firefox + WebKit)
npx playwright test --project=chromium      # Run on one browser only
npx playwright test chatbot.spec.ts         # Run a single file
npx playwright test --ui                    # Open interactive UI mode
npx playwright test --debug                 # Step through with Playwright Inspector
npx playwright show-report                  # Open last HTML report
```

Playwright E2E tests live in `tests/e2e/`. All tests in the suite run without auth — they cover unauthenticated UI, mocked `/api/scrape` and `/api/chat` routes, and the expected "Unauthorized" errors that server actions return when no session exists. Reader and authenticated library tests require a saved Google OAuth session (`storageState`); see the comment block at the bottom of `tests/e2e/library.spec.ts` for setup instructions.

## Environment Variables

Required in `.env.local`:
- `POSTGRES_URL` — PostgreSQL connection string
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth credentials
- `AUTH_SECRET` — NextAuth secret

The Gemini API key is **not** an environment variable; users provide it at runtime via the ChatBot UI.

## Architecture

This is a single-page Next.js app where all views (`Library`, `Reader`) are rendered on the root route (`/`) with React state controlling which view is shown. There is no routing beyond the root page.

### Data Flow

All database access goes through **Next.js Server Actions** in `src/app/actions.ts`. Components call these directly — there is no separate API layer for app data (only the scraper and chat use API routes).

### Key Layers

- **`src/app/page.tsx`** — Root client component; manages global state (`stories`, `activeStory`, `user`) and renders the appropriate view
- **`src/app/actions.ts`** — All server actions: auth (`login`/`logout`/`getCurrentUser`), stories CRUD, reading progress, settings, chat history
- **`src/db/schema.ts`** — Drizzle schema: NextAuth tables (`user`, `account`, `session`, `verificationToken`) + app tables (`stories`, `reading_progress`, `settings`, `chat_history`)
- **`src/db/index.ts`** — Drizzle client using `pg` pool (SSL enabled in production)
- **`src/lib/types.ts`** — Shared TypeScript interfaces (`Story`, `ReadingProgress`, `ReaderSettings`, `ChatMessage`)

### API Routes

- `POST /api/scrape` — Fetches a URL server-side via Cheerio, extracts article content, author, title, word count. Uses a hierarchy of selectors: `article`/`[role="main"]`/`main` → most-paragraphs div → body fallback.
- `POST /api/chat` — Proxies to Google Gemini (`gemini-3-flash-preview`) with a sci-fi/fantasy recommendation system prompt and Google Search tool enabled. Requires user-supplied API key in the request body.

### Auth

Uses **NextAuth v5 beta** with Google OAuth and JWT session strategy. The middleware (`middleware.ts`) runs on all non-static routes. Auth config is split: `src/auth.config.ts` (edge-compatible, providers only) and `src/auth.ts` (full config with Drizzle adapter + callbacks). This split is required for Next.js middleware compatibility.

### Database Schema Notes

- `lineHeight` in the `settings` table is stored as an integer × 10 (e.g., `1.8` → `18`). Divide by 10 when reading, multiply × 10 when writing.
- `stories.id` is either a scraped original ID or a UUID.
- `reading_progress` has a composite primary key of `(userId, storyId)`.
- Chat history is stored as full replace (delete + re-insert of last 50 messages) on each save.

# Dream Painter

Speak or type a dream right after waking. Dream Painter asks a few gentle questions, then paints
it and writes a short poem. Over time it keeps a private dream diary of recurring symbols and moods.

Local-first: dreams are stored in a SQLite file on your machine.

## Requirements
- Node.js 20.9+ (developed on Node 24)
- An Anthropic API key

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your ANTHROPIC_API_KEY
npm run dev
```

Open http://localhost:3000.

## Scripts
| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | Generate Drizzle migrations from `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to the local database |
| `npm run db:studio` | Browse the local database |

## Configuration
See `.env.example`. Keys are read only on the server and never sent to the browser.
The database file lives in `data/` (git-ignored).

## Structure
```
app/         routes and layouts
components/  UI components
lib/ai/      Anthropic client + pluggable image provider (generateImage)
lib/db/      Drizzle schema and SQLite connection
data/        local SQLite database (not committed)
```

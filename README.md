# Dream Painter

Speak or type a dream right after waking. Dream Painter asks a few gentle questions, paints it,
writes a short poem, and keeps a private diary of your recurring symbols and moods.

Local-first: dreams and paintings are stored on your machine. No account, no analytics.

## Requirements
- Node.js 20.9+ (developed on Node 24)
- An Anthropic API key only if you turn off the built-in mock AI

## Run locally

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Open http://localhost:3000. Seeding is optional: it adds 15 sample dreams, can be re-run safely,
and never touches your own dreams.

## Mock or real AI
`USE_MOCK_AI` defaults to `true`, so everything works with no keys. To use Claude for questions,
analysis and poems, set `USE_MOCK_AI=false` and `ANTHROPIC_API_KEY` in `.env.local`.

**Gemini only:** set `USE_MOCK_AI=false`, `TEXT_PROVIDER=gemini`, `IMAGE_PROVIDER=gemini` and
`GEMINI_API_KEY`. Gemini text has a free tier (Google may use free-tier data to improve its products);
Gemini paintings need billing, so use `IMAGE_PROVIDER=mock` to stay free.

For real paintings with OpenAI instead, set `IMAGE_PROVIDER=openai` and `OPENAI_API_KEY` (OpenAI GPT Image).
Model, size and quality are adjustable in `.env.local`; only the generated image prompt is sent,
never your raw dream text. To add another painter, create a file in `lib/ai/providers/` that
implements `ImageProvider` and register it in `lib/ai/providers/index.ts`.

## Scripts
| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and serve |
| `npm run lint` / `npm run typecheck` | Code checks |
| `npm run test:pipeline` | Runs followups, analysis, painting, poem and save end to end |
| `npm run test:openai-image` | Offline check of the OpenAI painter (no key or network) |
| `npm run test:gemini` | Offline check of the Gemini text and image providers |
| `npm run db:seed` | Replaces the sample dreams |
| `npm run db:generate` / `npm run db:migrate` | Create / apply Drizzle migrations (also applied on first run) |
| `npm run db:studio` | Browse the local database |

## Privacy and security
- Dreams, paintings and the passcode hash live in `data/`, which git ignores.
- Dream text leaves the device only when `USE_MOCK_AI=false`: the dream goes to Anthropic, and
  with `IMAGE_PROVIDER=openai` the image prompt goes to OpenAI. With Gemini selected, both go to Google.
- API keys are read on the server and never reach the browser.
- The optional passcode (Settings) gates every page, API route and painting.
- Requests from other websites and unknown hostnames are refused.

## Install as an app
Dream Painter is a PWA. Installing and notifications need `localhost` or HTTPS. Browser
notifications only fire while the app is open, so Settings also offers a daily calendar event.

## Structure
```
app/         routes, layouts and API handlers
components/  UI (capture, dream, diary, insights, year, settings, ui)
hooks/       browser speech recognition
lib/ai/      text and painting functions, schemas, providers
lib/db/      Drizzle schema, migrations, queries
proxy.ts     hostname allow-list and passcode gate
scripts/     seed, pipeline test, icon generator
data/        local database, paintings, lock file (not committed)
```

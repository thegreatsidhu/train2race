# Vitality

> Every wearable you wear, one signal you can trust.

Vitality aggregates Garmin, Whoop, Strava, and Apple Health into a single normalized view, runs a nightly AI agent that syncs your data and generates a personalized daily advice card, and provides an always-on chat coach that knows your actual numbers.

**What it does:**
- Pulls data nightly from every connected device (automatically, no manual action)
- Computes your 30-day personal baselines for resting HR, HRV, sleep score, and recovery
- Flags when key metrics drift meaningfully outside *your own* normal range (non-diagnostic — it tells you to see a doctor, never speculates about causes)
- Generates a daily written advice card tailored to your goals (training, race prep, general health, cardiac awareness)
- Provides a chat coach that has your current data in context every turn
- Supports multi-user login (email/password + Google OAuth)

**Device support:**
| Source | Type | Data |
|--------|------|------|
| Whoop | OAuth (self-serve, up to 10 users free) | HRV, recovery %, strain, sleep, SpO2 |
| Strava | OAuth (self-serve, requires active Strava sub) | Activities/workouts only |
| Garmin | OAuth (requires Developer Program approval, ~2 days) | All health metrics + activities |
| Apple Watch | Webhook (via Health Auto Export iOS app) | All HealthKit metrics + workouts |

---

## Prerequisites

- Node.js 18+ and npm
- A Postgres database (free tier on [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Railway](https://railway.app) all work)
- A [Vercel](https://vercel.com) account (free tier is fine for personal/small use)
- An [Anthropic API key](https://console.anthropic.com/settings/keys)
- Developer accounts for whichever wearable sources you want to connect (see per-source setup below)

---

## Local setup

### 1. Clone and install

```bash
git clone <your-repo-url> vitality
cd vitality
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value. See the per-source sections below for where to get each one. The minimum set to get the app running is:

```
DATABASE_URL=           # your Postgres connection string
AUTH_SECRET=            # openssl rand -base64 32
ENCRYPTION_KEY=         # openssl rand -base64 32  (must decode to exactly 32 bytes)
ANTHROPIC_API_KEY=      # from console.anthropic.com
GARMIN_MOCK_MODE=true   # leave true until Garmin Developer Program approval lands
```

Everything else (Google OAuth, Whoop, Strava, Garmin real credentials) can be added incrementally — the app works without them, it just won't have those sources available.

### 3. Set up the database

```bash
npx prisma generate    # generates the TypeScript client from schema.prisma
npx prisma db push     # pushes the schema to your Postgres database (creates all tables)
```

If `db push` succeeds, you'll see each model listed as "created". You only need to run this again when the schema changes.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you should see the landing page. Sign up, connect a device, and trigger a manual sync or advice generation from the dashboard.

---

## Per-source OAuth setup

### Whoop

1. Go to [developer.whoop.com](https://developer.whoop.com) and sign in with your Whoop account
2. Create a new application — any name, choose "Web Application"
3. Set the redirect URI to: `https://yourdomain.com/api/connectors/whoop/callback`
   - For local dev: `http://localhost:3000/api/connectors/whoop/callback`
4. Copy Client ID and Client Secret into `.env.local`
5. Self-serve up to 10 connected users — apply for broader access in the dashboard once you need more

```env
WHOOP_CLIENT_ID=your_client_id
WHOOP_CLIENT_SECRET=your_client_secret
WHOOP_REDIRECT_URI=https://yourdomain.com/api/connectors/whoop/callback
```

### Strava

1. Go to [strava.com/settings/api](https://www.strava.com/settings/api)
2. Create an application — set "Authorization Callback Domain" to your domain (no https://, no path)
3. **Note:** As of June 2026, Strava requires an active Strava subscription to operate as a Standard Tier developer. Your personal Strava subscription counts.
4. Copy Client ID and Client Secret into `.env.local`
5. Self-serve up to 10 athletes — request Extended Access for more

```env
STRAVA_CLIENT_ID=your_client_id
STRAVA_CLIENT_SECRET=your_client_secret
STRAVA_REDIRECT_URI=https://yourdomain.com/api/connectors/strava/callback
```

### Garmin

Garmin requires a formal application to the Garmin Connect Developer Program:

1. Go to [developer.garmin.com/gc-developer-program](https://developer.garmin.com/gc-developer-program/)
2. Submit a business-use application describing what Vitality does
3. Approval takes approximately 2 business days, followed by an onboarding call where you get real credentials
4. **Until then, leave `GARMIN_MOCK_MODE=true`** — the app will use realistic synthetic data for the dashboard, AI advice, and chat coach so you can use and develop everything without waiting

```env
GARMIN_MOCK_MODE=true          # flip to "false" once real credentials are in place
GARMIN_CLIENT_ID=              # from Garmin Developer Program (leave blank until approved)
GARMIN_CLIENT_SECRET=
GARMIN_REDIRECT_URI=https://yourdomain.com/api/connectors/garmin/callback
```

### Apple Watch (via Apple Health)

Apple has no public web API for HealthKit, so this works through a push model instead:

1. Each user installs **[Health Auto Export](https://apps.apple.com/us/app/health-auto-export-json-csv/id1477944755)** on their iPhone (paid app, ~$5)
2. In the app: tap **Automations → REST API** and create a new automation
3. The user gets their personal webhook URL from **Connections → Apple Watch** in Vitality's dashboard
4. Paste that URL as the REST API endpoint in Health Auto Export
5. Set the schedule (daily or hourly) and format to **JSON**
6. The app will push their HealthKit data to Vitality automatically on that schedule

No OAuth setup needed on your end — the webhook endpoint is already live once the app is deployed.

### Google OAuth (for "Continue with Google" login)

1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new OAuth 2.0 Client ID — type "Web application"
3. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
4. Copy Client ID and Client Secret into `.env.local`

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```

If you skip this, the "Continue with Google" button on the login/signup page will not work, but email+password auth still functions normally.

---

## Deploying to Vercel

### 1. Push your code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/vitality.git
git push -u origin main
```

### 2. Create a Vercel project

1. Go to [vercel.com/new](https://vercel.com/new) and import your GitHub repo
2. Framework preset will auto-detect as Next.js — leave all build settings as-is
3. **Do not deploy yet** — set env vars first

### 3. Add environment variables in Vercel

In your Vercel project → Settings → Environment Variables, add every variable from `.env.example`. Key points:
- **For production**, update all redirect URIs from `http://localhost:3000` to `https://yourdomain.com`
- `NEXTAUTH_URL` should be your production URL (e.g. `https://vitality.vercel.app`)
- Vercel automatically handles the `CRON_SECRET` injection into cron job requests when you set the variable

### 4. Add a Postgres database

Option A — Vercel Postgres (easiest):
1. In your Vercel project → Storage → Create Database → Postgres
2. Vercel auto-adds `DATABASE_URL` and `POSTGRES_*` env vars to your project

Option B — Neon (free tier, more generous limits):
1. Create a project at [neon.tech](https://neon.tech) — free tier gives you 0.5GB
2. Copy the "pooled connection string" and add it as `DATABASE_URL` in Vercel

Option C — Supabase or Railway work similarly — just grab the Postgres connection string.

### 5. Run database migrations on Vercel

After first deploy, open Vercel → your project → Functions tab, or run locally pointing at your production DB:

```bash
DATABASE_URL="your_production_connection_string" npx prisma db push
```

Or add a build command in `package.json` to run it automatically on every deploy:

```json
"scripts": {
  "build": "prisma generate && next build"
}
```

### 6. Deploy

```bash
git push origin main
```

Vercel will auto-deploy. Once live, go to `https://yourdomain.com`, create an account, and connect your devices.

### 7. Verify the cron job

The nightly sync runs at 5am UTC via `vercel.json`. To verify it's configured:
- Vercel dashboard → your project → Cron Jobs tab
- You should see `/api/cron/nightly-sync` scheduled for `0 5 * * *`
- You can trigger it manually from that tab to test

---

## Architecture overview

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # NextAuth handlers + signup endpoint
│   │   ├── chat/          # Chat coach API (POST message, GET history)
│   │   ├── connectors/    # OAuth start/callback/sync + Apple Health webhook
│   │   ├── cron/          # Nightly sync + advice generation (Vercel Cron)
│   │   ├── advice/        # Manual advice generation trigger
│   │   └── races/         # Race target CRUD
│   └── dashboard/         # Today, Coach, Race plans, Connections pages
├── components/            # UI: ChatUI, Waveform, TrendChart, etc.
└── lib/
    ├── ai/                # Metrics aggregation, baseline computation, Claude API calls
    ├── auth.ts            # NextAuth config (Google + credentials)
    ├── connectors/        # Garmin, Whoop, Strava, Apple Health implementations
    ├── crypto.ts          # AES-256-GCM token encryption
    ├── prisma.ts          # Prisma client singleton
    └── sync/              # OAuth sync engine + DB upsert helpers
```

**Data flow:**
1. User connects a device → OAuth tokens stored encrypted in `device_connections`
2. Nightly cron (or manual sync) calls each connector → normalized data upserted into `daily_metrics` and `activities`
3. Advice engine merges all sources per day, computes 30-day baselines, detects cardiac-relevant drift, calls Claude to generate an `advice_card`
4. Dashboard reads today's merged metrics + advice card — no live API calls needed for page load
5. Chat coach injects last 7 days of merged metrics + goals + race targets into every Claude API call as context

---

## Turning off Garmin mock mode

When your Garmin Developer Program approval comes through:

1. Add your real credentials to `.env.local` (and Vercel env vars for production)
2. Set `GARMIN_MOCK_MODE=false`
3. Note: Garmin's real API uses a push (webhook) model for most data — during your onboarding call, they'll give you the exact endpoint paths and webhook configuration. The `mapGarminDailiesToNormalized` and `mapGarminActivitiesToNormalized` functions in `src/lib/connectors/garmin.ts` have comments marking where to update the field mappings once you can see real payloads.

---

## Scaling beyond 10 users per source

- **Whoop:** Apply for "Broad Access" in the Whoop Developer Dashboard — no fee, just a review
- **Strava:** Apply for Extended Access at developers.strava.com — review required
- **Garmin:** Covered by your Developer Program agreement
- **Apple Health:** Unlimited — webhook model, no per-user approval

---

## Security notes

- OAuth access and refresh tokens are encrypted at rest using AES-256-GCM before being stored in the database. The key is your `ENCRYPTION_KEY` env var — back this up. If it's lost, all stored tokens become unrecoverable and every user will need to reconnect their devices.
- The Apple Health webhook URL contains a per-user secret token. Treat it like a password — anyone with it can post health data as that user.
- The cron endpoint is protected by `CRON_SECRET`. Vercel injects this automatically; don't expose it publicly.
- This app handles sensitive health data. Use a strong `AUTH_SECRET`, enable HTTPS (Vercel handles this automatically), and never log raw token values.

---

## Disclaimer

Vitality is a personal fitness coaching and wellness tracking tool. It is not a medical device, does not diagnose any medical condition, and is not a substitute for professional medical advice. The cardiac trend flagging feature surfaces statistical deviations from your own historical baseline and recommends consulting a doctor — it makes no claims about the clinical significance of any reading.
 
 
# Budget Buddy

An AI-assisted personal finance app. Import a bank statement, get expenses
categorized automatically, track budgets and savings goals, scan receipts,
and ask a finance assistant questions about your own spending — all backed
by a real database with row-level security, not a demo with fake data.

**Live app:** https://budget-buddy-sepia-psi.vercel.app
**API:** https://bugetbud-api.victorioussand-34f59fc2.japaneast.azurecontainerapps.io/api/health

---

## What it does

- **CSV import** — upload a bank statement and transactions are parsed,
  deduplicated, and categorized automatically. Handles both a generic CSV
  format and DBS/POSB exports, detected server-side.
- **Transactions** — full CRUD with search, category and date filtering,
  sorting, and pagination.
- **Budgets** — set a monthly limit per category and track spend against it.
- **Savings goals** — target amount, optional target date, contributions,
  progress tracking.
- **Subscriptions** — recurring costs with billing cycles and upcoming
  renewal reminders.
- **Receipt scanning** — snap or upload a photo of a receipt; an AI vision
  model extracts merchant, amount, date, and category for confirmation
  before it's saved.
- **AI insights chat** — ask questions about your own transactions and
  budgets in plain language; answers are grounded in numbers computed
  server-side, not invented by the model.
- **Auth** — email/password via Supabase Auth, enforced with Postgres
  row-level security so each user only ever sees their own rows.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4, React Router |
| Backend | FastAPI (Python), Uvicorn |
| Database & Auth | Supabase (PostgreSQL + Row-Level Security) |
| AI | Azure AI Foundry (chat insights + receipt vision extraction) |
| Frontend hosting | Vercel |
| Backend hosting | Azure Container Apps, via Azure Container Registry |

## Architecture

```
React (Vite)  ──HTTPS──▶  FastAPI  ──┬──▶  Supabase (Postgres, RLS, Auth)
                                      └──▶  Azure AI Foundry (chat + vision)
```

The frontend never talks to Supabase directly. Every request goes through
the FastAPI backend, which authenticates the caller's Supabase JWT and then
queries Postgres using the Supabase **anon** key plus that user's own token
— never a service-role key — so row-level security is enforced by the
database itself rather than trusted application code.

## Project structure

```
backend/
  app/
    routers/        # one file per resource: transactions, budgets, savings,
                     # subscriptions, receipts, insights, profile, auth
    main.py          # FastAPI app, CORS, router registration
    supabase_client.py  # per-request Supabase client scoped to the caller
    azure_client.py     # AI chat insights (Azure AI Foundry)
    receipt_ai.py       # receipt vision extraction
    finance.py           # spending/budget calculations
  tests/
frontend/
  src/
    pages/           # one file per screen (Dashboard, Transactions, Budgets, ...)
    components/       # shared UI (forms, filters, date picker, icons)
    services/          # API client, auth, categories
demo-data/
  seed.py            # seeds a demo account with realistic transactions
SCHEMA.md            # database schema and RLS policy reference
```

## Running locally

### 1. Database (Supabase)

Create a Supabase project, then run the SQL in [`SCHEMA.md`](./SCHEMA.md)
(schema, then row-level security policies) in the Supabase SQL editor.
Confirm RLS is on for every table:

```sql
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
and tablename in ('profiles', 'transactions', 'budgets', 'savings_goals', 'subscriptions');
```

All rows should read `true`. Also turn off **Confirm email** under
Authentication → Providers → Email for local testing, or every sign-up will
wait on a confirmation link.

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env` from `.env.example` and fill in your Supabase and
Azure AI Foundry credentials, then:

```bash
uvicorn app.main:app --reload --port 8000
```

Interactive API docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # set VITE_API_BASE_URL
npm run dev
```

Runs at `http://localhost:5173`.

### 4. Demo data (optional)

```bash
pip install httpx
python demo-data/seed.py you@example.com yourpassword
```

Seeds a few months of realistic transactions across all categories against
your own account. Safe to re-run — duplicates are skipped.

## Deployment

**Backend** — built as a Docker image, pushed to Azure Container Registry,
and run on Azure Container Apps:

```bash
docker build -t <registry>.azurecr.io/budget-buddy-api:<tag> ./backend
docker push <registry>.azurecr.io/budget-buddy-api:<tag>
az containerapp update --name <app-name> --resource-group <rg> \
  --image <registry>.azurecr.io/budget-buddy-api:<tag>
```

Required environment variables on the Container App: `SUPABASE_URL`,
`SUPABASE_ANON_KEY`, `SUPABASE_JWKS_URL`, `CORS_ORIGINS`,
`AZURE_AI_FOUNDRY_ENDPOINT`, `AZURE_AI_FOUNDRY_API_KEY`,
`AZURE_AI_FOUNDRY_DEPLOYMENT`.

**Frontend** — deployed on Vercel with root directory set to `frontend/`
and `VITE_API_BASE_URL` pointing at the backend's `/api` path. A
`vercel.json` rewrite serves `index.html` for every route so client-side
routing survives a page refresh.

After deploying, add the frontend's origin to the backend's `CORS_ORIGINS`,
and add the frontend's origin to Supabase's Auth → URL Configuration (Site
URL and Redirect URLs) so email confirmation links point at the right
place.

## Roadmap

- End-of-month balance prediction
- PDF statement import (RAG-based extraction)
- Voice assistant for the AI chat
- Investment insights
- Push notifications for upcoming subscription renewals and budget overruns

# Team setup — read this before building your part

This is the shared foundation for Budget Buddy. Don't recreate any of the
files listed under "Shared" below — pull this branch, then only add the
files listed under "Yours to add."

## 0. One repo, one base — do this first

Right now `main` on GitHub only has the initial README. Everything below
lives on the `dashboard-insights-ai` branch (merged from Person B's
`budgets-savings-subscriptions` branch + Person C's additions). **Push this
branch and merge it into `main` before Person A starts building** — otherwise
Person A will branch from an empty `main` and end up creating a third,
incompatible backend/frontend from scratch, same problem we just spent time
fixing between B and C.

Once it's in `main`, everyone does:
```bash
git checkout main
git pull
git checkout -b <your-feature-branch>
```

## 1. One shared Supabase project

All three of us must point at the **same** Supabase project — not one each.
Whoever hasn't already done this:

1. Create the Supabase project (or use the one already created).
2. Open the SQL editor, run `supabase/schema.sql` once. This defines
   `transactions`, `budgets`, `savings_goals`, `subscriptions`, and RLS
   policies for all four tables — already covers Person A's `transactions`
   table too, so Person A doesn't need to write their own schema, just build
   against it (and extend `schema.sql` with a PR if the shape needs to
   change).
3. Share the project's `SUPABASE_URL` and `SUPABASE_ANON_KEY` with the other
   two privately (Slack DM, not committed to git — `backend/.env` and
   `frontend/.env` are both gitignored).

## 2. Shared backend — one FastAPI app, everyone adds a router

Location: `backend/app/`. Don't create a second `main.py` or a second
`config.py` — add to these instead:

**Shared, don't duplicate:**
- `main.py` — the one FastAPI app. To add your feature, add one line:
  `app.include_router(yourfeature.router, prefix="/api")`
- `config.py` — the one `Settings` class (env vars). Add your own fields to
  it if you need a new env var, don't make your own settings file.
- `dependencies.py` — `AccessToken`, the shared dependency that pulls the
  bearer token off the request. Use it in your own router.
- `supabase.py` — `SupabaseREST`, the shared PostgREST client that forwards
  the caller's own token so RLS scopes every query to that user. Use this
  instead of writing your own Supabase HTTP calls.
- `requirements.txt` / `.env.example` — add your new dependency or env var
  to these files, don't fork them.

**Yours to add (one file each, no collisions):**
- Person A: `backend/app/routers/transactions.py`
- Person C (done): `backend/app/routers/insights.py`, `auth.py`,
  `azure_client.py`, `finance.py`

Pattern to copy (this is `budgets.py`, already working):
```python
from fastapi import APIRouter
from ..dependencies import AccessToken
from ..supabase import SupabaseREST

router = APIRouter(prefix="/transactions", tags=["transactions"])

@router.get("")
async def list_transactions(token: AccessToken):
    db = SupabaseREST(token)
    return await db.request("GET", "transactions", params={"select": "*", "order": "transaction_date.desc"})
```

## 3. Shared frontend — one React app under `frontend/`, everyone adds a page

Don't create a second `App.tsx`, a second `package.json`, or a parallel
frontend elsewhere in the repo.

**Shared, don't duplicate:**
- `App.tsx` — the one router. Add your route inside the existing
  `<Route element={<Layout />}>` block.
- `components/Layout.tsx` — the one nav shell. Add your link to the `links`
  array.
- `services/api.ts` — the one `api<T>(path, options)` fetch helper. It reads
  the Supabase access token from `localStorage["budget_buddy_access_token"]`
  and calls the shared FastAPI backend at `VITE_API_URL` (default
  `http://localhost:8000/api`). Use it instead of writing your own fetch
  wrapper. Note: its demo/preview fallback (`isPreviewMode()`, no token yet)
  only knows the budgets/savings/subscriptions domains — Person A, check
  `demoData()` in `api.ts` if you want `/transactions` to work in preview
  mode too, otherwise guard preview mode yourself like `transactionsApi.ts`
  does.
- `hooks/useResource.ts` — generic list-fetching hook, reuse it.
- `types.ts` — add your interface here, don't make a separate types file.
- `index.css` / `tailwind.config.js` — the shared dark theme (`.card`,
  `.field`, `.btn-primary`, `.metric` utility classes already defined).

**Yours to add:**
- Person A: `frontend/src/pages/TransactionsPage.tsx` (+ auth pages/flow —
  this is also where `localStorage["budget_buddy_access_token"]` must get
  set after login, everyone else's preview/demo mode depends on that key)
- Person C (done): `pages/DashboardPage.tsx`, `pages/AiChatPage.tsx`,
  `components/charts/`, `components/InsightCard.tsx`,
  `services/aiService.ts`, `services/transactionsApi.ts`,
  `utils/finance.ts`, `utils/insightRules.ts`, `data/fixtures.ts`

## 4. AI provider — Azure AI Foundry only, team decision made

Whole project standardizes on Azure AI Foundry. OpenAI has been removed
(`openai` dependency, `OPENAI_API_KEY`/`OPENAI_MODEL`) from
`requirements.txt`/`config.py`/`.env.example` — don't add it back.

- Person C's `/api/insights/ask` already calls Azure AI Foundry's
  `v1/responses` endpoint (`azure_client.py`) — done, working.
- Person B's receipt scanning still needs its backend route built
  (`backend/app/routers/receipts.py` doesn't exist yet — frontend/model are
  ready, waiting on the server-side call). When you build it, call Azure AI
  Foundry's vision-capable deployment instead of OpenAI's vision API — same
  `AZURE_AI_FOUNDRY_*` env vars already in `config.py`, just send image
  content in the request instead of text-only.

## 5. Deployment (one target each, not three)

- **Frontend → one Vercel project**, root directory set to `frontend/`
  (Vercel won't auto-detect this since the repo root isn't the app root —
  set it in Project Settings → Root Directory).
- **Backend → one hosting target** (Azure Container Apps, Render, Railway —
  whatever's decided) serving `backend/`. Not created yet; whoever sets it
  up first, share the URL so the other two can point `VITE_API_URL` at it.
- **Supabase** — already covered in step 1, one project for everyone.

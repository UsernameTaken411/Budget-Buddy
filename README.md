# Budget Buddy

Budget Buddy is a personal-finance copilot built with React, FastAPI, and
Supabase. Azure AI Foundry is the only AI provider used anywhere in the
project.

Person B vertical:
- **Budgets** — category limits with live spent/remaining progress
- **Savings goals** — target dates and contribution tracking
- **Subscriptions** — recurring-charge tracking with monthly cost normalization
- **AI receipt capture** — structured extraction of merchant/amount/category
  from a photo; frontend and data model are in place, the backend route
  that calls Azure AI Foundry's vision-capable model still needs to be
  wired up in `backend/app/routers/`

Person C vertical:
- **Dashboard** — live summary totals from transactions/budgets
- **Charts** — spending by category, income vs. expenses over time
- **Insights** — rule-based budget/spending alerts, no AI call needed
- **AI chat** — free-text questions answered via Azure AI Foundry, grounded
  in real, already-computed numbers (`POST /api/insights/ask`)

## Run locally

### 1. Supabase

Create a Supabase project and run `supabase/schema.sql` in the SQL editor.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `AZURE_AI_FOUNDRY_ENDPOINT` /
`AZURE_AI_FOUNDRY_API_KEY` / `AZURE_AI_FOUNDRY_DEPLOYMENT` in `backend/.env`.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

The UI expects Person A's authentication flow to store the Supabase access
token as `budget_buddy_access_token`. For integration work, open the app with a
valid token already stored:

```js
localStorage.setItem("budget_buddy_access_token", "<supabase-access-token>")
```

## API

All routes require `Authorization: Bearer <Supabase JWT>`.

| Domain | Routes |
| --- | --- |
| Budgets | `GET/POST /api/budgets`, `PATCH/DELETE /api/budgets/{id}` |
| Savings | `GET/POST /api/savings-goals`, `PATCH/DELETE /api/savings-goals/{id}`, `POST /api/savings-goals/{id}/contributions` |
| Subscriptions | `GET/POST /api/subscriptions`, `PATCH/DELETE /api/subscriptions/{id}` |
| Receipt capture | `POST /api/receipts/scan`, `POST /api/receipts/confirm` (not implemented yet) |
| AI insights | `POST /api/insights/ask` |

Interactive API docs are available at `http://localhost:8000/docs`.

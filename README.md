# Budget Buddy

Budget Buddy is a personal-finance copilot built with React, FastAPI, and
Supabase. This branch contains the complete Person B vertical:

- **Budgets** — category limits with live spent/remaining progress
- **Savings goals** — target dates and contribution tracking
- **Subscriptions** — recurring-charge tracking with monthly cost normalization
- **AI receipt capture** — mobile camera/upload, structured extraction, user
  confirmation, and automatic transaction creation

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

Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `OPENAI_API_KEY` in
`backend/.env`. `OPENAI_MODEL` defaults to `gpt-4o-mini` and can be changed to
another vision-capable deployment.

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
| Receipt capture | `POST /api/receipts/scan`, `POST /api/receipts/confirm` |

Interactive API docs are available at `http://localhost:8000/docs`.

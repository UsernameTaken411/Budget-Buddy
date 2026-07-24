# Person A — Identity & Transactions

Auth, transactions, CSV import. Owns `profiles` and `transactions`, plus the
shared auth modules that B and C import.

The API contract lives in [`SCHEMA.md`](./SCHEMA.md). Read §1 before touching
anything — especially the sign convention.

---

## Setup

### 1. Database

Run the DDL from `SCHEMA.md` §1, §3, §4 in the Supabase SQL editor, then the
RLS policies from §6. Verify:

```sql
select tablename, rowsecurity from pg_tables
where schemaname='public'
and tablename in ('profiles','transactions','budgets','savings_goals','subscriptions');
```

All five must be `true`.

**Turn off email confirmation** — Authentication → Providers → Email →
uncheck "Confirm email". Otherwise every signup stalls waiting for a click.

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```bash
SUPABASE_URL=https://YOUR_REF.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key

# ONE of these, depending on Settings → API → JWT:
SUPABASE_JWKS_URL=https://YOUR_REF.supabase.co/auth/v1/.well-known/jwks.json
# SUPABASE_JWT_SECRET=your-legacy-jwt-secret

CORS_ORIGINS=http://localhost:5173
```

```bash
uvicorn app.main:app --reload --port 8000
```

Interactive docs at http://localhost:8000/docs.

> Install from `requirements.txt`, not latest. A FastAPI/Starlette version
> mismatch causes routes to silently fail to register — the app starts fine and
> every endpoint 404s.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # then fill in your values
npm run dev
```

http://localhost:5173

### 4. Demo data

Each teammate runs this against their **own** account — RLS means your rows are
invisible to everyone else.

```bash
pip install httpx
python demo-data/seed.py you@example.com yourpassword
```

237 rows, March–June 2026, all categories. Re-running is safe; duplicates are
skipped, not doubled.

---

## Smoke tests

Run these in order. Don't build further until each passes.

**Auth guard:**
```bash
curl -i localhost:8000/api/transactions                          # 401
curl -i -H "Authorization: Bearer garbage" \
     localhost:8000/api/transactions                             # 401
```

**Contract shape** — get a token from the browser console after logging in, or:
```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"you@test.com","password":"pw"}' | jq -r .access_token
```
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  "localhost:8000/api/transactions?limit=5" | jq
```
Expect `{"items":[],"total":0,"limit":5,"offset":0}` — `items` is an array, never null.

**RLS isolation — the one that matters most.** Create a second user in an
incognito window. Add a transaction as user 1. Log in as user 2. You must see
zero rows. If user 1's data appears, either RLS is off or something is using the
service-role key.

**Sign convention.** Add one expense and one income through the UI:
```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  localhost:8000/api/transactions | jq '.items[].amount'
```
Expect one negative, one positive. If both are positive, B's budget math is
silently wrong.

**Three states.** Empty (new account), loading (throttle to Slow 3G in devtools),
error (stop uvicorn, reload). All three must render — P0 isn't done otherwise.

---

## CSV import

The importer detects format server-side and returns which one it used.

**Generic** — needs a date column and an amount column; description and category
are optional. Header spellings are matched loosely (`Transaction Date`, `Value
Date`, `Amount`, `Details`, …). Handles `1,234.56`, `(12.34)` for negatives,
`SGD` prefixes, trailing `CR`/`DR`, and several date formats.

**DBS/POSB** — detected by the preamble lines. Normalized into the generic shape
first, so there is only one parser: separate Debit/Credit columns collapse to one
signed amount, `Transaction Ref1/2/3` join into the description, and amounts
split across a thousands separator are rejoined.

> That last one is subtle. DBS doesn't quote amount fields, so `4,200.00`
> arrives as two CSV cells. Unrepaired, a $4,200 salary imports as **$4.00**
> with every later column shifted — and no error is raised.

Bad rows never abort the import. They come back in `errors[]` with the row
number as it appears in Excel.

Duplicates are detected on (date, amount, description) within the file's date
range and skipped.

---

## Deploy (Azure Container Apps)

```bash
docker build -t finance-api ./backend

docker build ./frontend -t finance-web \
  --build-arg VITE_SUPABASE_URL=https://YOUR_REF.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=your-key \
  --build-arg VITE_API_BASE_URL=https://YOUR-API.azurecontainerapps.io/api
```

`VITE_*` vars are inlined at build time, so they're build args, not runtime env.

After deploying the API, add the frontend's public origin to `CORS_ORIGINS` and
restart it — otherwise the browser blocks every request while curl still works.

Deploy a hello-world container early, around hour 5. CORS and image config are
where the time goes, and you want to hit them while you still have patience.

---

## For B and C

Import these; don't reimplement them.

| Path | Exports |
|---|---|
| `frontend/src/services/supabase.js` | `supabase` |
| `frontend/src/services/auth.jsx` | `AuthProvider`, `useAuth()` |
| `frontend/src/services/api.js` | `apiFetch()`, `fetchAllTransactions()` |
| `frontend/src/services/categories.js` | `CATEGORIES`, `CATEGORY_LABELS`, `spend()`, `totalsByCategory()` |
| `frontend/src/components/ProtectedRoute.jsx` | `ProtectedRoute` |
| `backend/app/auth.py` | `get_current_user`, `CurrentUser` |
| `backend/app/supabase_client.py` | `db_for_user()` |

Frontend:
```js
import { apiFetch } from "../services/api";
const data = await apiFetch("/transactions?start_date=2026-03-01&limit=500");
```

Backend:
```python
@router.get("/budgets")
def list_budgets(user: CurrentUser = Depends(get_current_user)):
    return db_for_user(user).table("budgets").select("*").execute().data
```

Add your routes in `frontend/src/App.jsx`, your nav links in
`components/Layout.jsx`, your routers in `backend/app/main.py`. Each is a
one-line addition at a marked comment, so we don't collide.

**Three things that will bite you:**

1. **Expenses are negative.** `spend(t)` and `totalsByCategory()` in
   `categories.js` handle it — use them rather than `Math.abs()`, which counts
   income as spending.
2. **Paginate.** Default `limit` is 50. Aggregating without paging silently
   drops data. Use `fetchAllTransactions()`.
3. **Never use the service-role key.** It bypasses every RLS policy.

---

## Priority ladder

- **P0** — auth, manual add, generic CSV import, list view with loading/empty/error ✅
- **P1** — edit, delete, search, filter, sort, pagination, DBS/POSB detection ✅
- **P2** — profile page ✅

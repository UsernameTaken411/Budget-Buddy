# SCHEMA.md — Database & API Reference

The source of truth for the database schema, row-level security policies,
and the REST contract between the frontend and backend. If a table or
endpoint changes, update this file in the same commit as the code change.

| Domain | Tables | Endpoints |
|---|---|---|
| Identity & Transactions | `profiles`, `transactions` | `/auth/*`, `/transactions/*`, `/profile` |
| Budgets & Savings | `budgets`, `savings_goals`, `subscriptions` | `/budgets/*`, `/savings/*`, `/subscriptions/*` |
| Insights & Receipts | — (reads transactions/budgets) | `/insights/*`, `/receipts/*` |

---

## 0. Conventions that apply everywhere

- **Every table** has `id uuid primary key default gen_random_uuid()` and
  `user_id uuid not null references auth.users(id) on delete cascade`.
- **Every table** has RLS enabled with the identical `auth.uid() = user_id` policy (§6).
- **Dates** (`date` columns) are `YYYY-MM-DD`, no time, no timezone.
- **Timestamps** (`created_at`) are `timestamptz`, serialized as ISO-8601 UTC with `Z`.
- **Money** is `numeric(12,2)` in Postgres and a JSON **number** (not string) over the wire,
  always exactly 2 decimal places.
- Enum-ish text values are stored **lowercase snake_case**; display labels are a frontend concern.

---

## 1. `transactions` — the foundational table

Every other feature (budgets, insights, receipts) reads from this table.

```sql
create table transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12,2) not null,
  date        date not null,
  category    text not null default 'other',
  description text not null default '',
  created_at  timestamptz not null default now(),
  constraint transactions_category_check check (category in (
    'food','transport','groceries','shopping','bills','entertainment',
    'health','education','travel','income','transfer','other'
  ))
);

create index transactions_user_date_idx on transactions (user_id, date desc);
create index transactions_user_category_idx on transactions (user_id, category);
```

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | `uuid` | no | server-generated, never sent on create |
| `user_id` | `uuid` | no | set by the API from the JWT, **never** trusted from the request body |
| `amount` | `numeric(12,2)` | no | **signed** — see below |
| `date` | `date` | no | the transaction date, not the import date |
| `category` | `text` | no | closed vocabulary, see §2 |
| `description` | `text` | no | may be empty string, never null |
| `created_at` | `timestamptz` | no | row insert time, used for stable tiebreak sorting |

### ⚠️ AMOUNT SIGN CONVENTION — READ THIS TWICE

> **Expenses are NEGATIVE. Income is POSITIVE. There is no `type` column.**

- Lunch at a kopitiam → `-12.50`
- Salary → `+4200.00`
- A refund on a purchase → `+18.90` (it is money coming in)
- `0.00` is not allowed — reject at the API with 422.

Consequences to handle everywhere this value is read:

- **Budget spend** for a category is `sum(-amount) where amount < 0`.
  Do not `abs()` the whole set — that would count income as spending.
- **Spending-by-category charts** must filter `amount < 0` and negate.
  Net cashflow is a plain `sum(amount)`.
- **CSV import** is responsible for producing correct signs. A bank file
  with separate debit/credit columns is normalized to one signed number before insert.

Helper to use rather than re-deriving this logic:

```js
export const isExpense = (t) => t.amount < 0;
export const spend = (t) => (t.amount < 0 ? -t.amount : 0);
export const income = (t) => (t.amount > 0 ? t.amount : 0);
```

---

## 2. Category vocabulary — CLOSED ENUM

Not free text. Enforced by a DB `CHECK` constraint and validated at the API.
Budgets join on these strings; charts group by them. Adding a value requires
a migration and an edit to this file.

| Stored value | Display label | Typical sign |
|---|---|---|
| `food` | Food & Dining | negative |
| `transport` | Transport | negative |
| `groceries` | Groceries | negative |
| `shopping` | Shopping | negative |
| `bills` | Bills & Utilities | negative |
| `entertainment` | Entertainment | negative |
| `health` | Health | negative |
| `education` | Education | negative |
| `travel` | Travel | negative |
| `income` | Income | positive |
| `transfer` | Transfer | either |
| `other` | Other | either |

Rules:

- Import maps unknown merchant categories to `other`. It never invents a new value.
- `transfer` is excluded from spending charts and budget totals by convention —
  it is money moving between the user's own accounts, not consumption. Spend
  views filter `category != 'transfer'`.
- The canonical list is exported from **`frontend/src/services/categories.js`**
  (`CATEGORIES`, `CATEGORY_LABELS`). Import it; do not retype the array.

---

## 3. `profiles`

One row per user, created on first login.

```sql
create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null default '',
  currency     text not null default 'SGD',
  created_at   timestamptz not null default now()
);
```

Note `id` and `user_id` are the same value here; `user_id` is kept so the shared RLS
policy in §6 applies unchanged to all five tables.

---

## 4. Budgets, savings, and subscriptions

```sql
create table budgets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null,              -- MUST be a value from §2
  amount     numeric(12,2) not null,     -- positive: the monthly cap
  period     text not null default 'monthly',  -- 'monthly' only for v1
  created_at timestamptz not null default now(),
  unique (user_id, category, period)
);

create table savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  target_amount  numeric(12,2) not null,  -- positive
  current_amount numeric(12,2) not null default 0,
  target_date    date,
  created_at     timestamptz not null default now()
);

create table subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  amount       numeric(12,2) not null,   -- positive: the recurring charge
  cadence      text not null default 'monthly',  -- 'monthly' | 'yearly'
  next_due     date,
  category     text not null default 'bills',    -- MUST be a value from §2
  created_at   timestamptz not null default now()
);
```

Note the sign asymmetry, deliberately: `budgets.amount`, `savings_goals.target_amount`
and `subscriptions.amount` are **positive magnitudes**, because they are limits and targets
rather than ledger entries. Only `transactions.amount` is signed.

---

## 5. API

Base URL: `/api`. Every endpoint below requires `Authorization: Bearer <supabase_access_token>`.
Missing/invalid token → `401`. Valid token but row belongs to another user → `404` (not 403,
so we don't leak existence).

### 5.1 `GET /api/transactions` — the core read endpoint

Query parameters (all optional):

| Param | Type | Default | Notes |
|---|---|---|---|
| `start_date` | `YYYY-MM-DD` | — | inclusive |
| `end_date` | `YYYY-MM-DD` | — | inclusive |
| `category` | string, repeatable | — | `?category=food&category=transport` = OR |
| `q` | string | — | case-insensitive substring on `description` |
| `min_amount` | number | — | signed comparison |
| `max_amount` | number | — | signed comparison |
| `sort` | `date` \| `amount` \| `created_at` | `date` | |
| `order` | `asc` \| `desc` | `desc` | |
| `limit` | int 1–500 | `50` | |
| `offset` | int ≥ 0 | `0` | |

Response `200`:

```json
{
  "items": [
    {
      "id": "3f1b2c44-9a7e-4a1d-8f2b-0c5d6e7a8b90",
      "user_id": "8c2e1a55-1111-2222-3333-444455556666",
      "amount": -12.50,
      "date": "2026-03-14",
      "category": "food",
      "description": "Kopitiam lunch",
      "created_at": "2026-03-14T04:12:33Z"
    }
  ],
  "total": 428,
  "limit": 50,
  "offset": 0
}
```

Guarantees callers can rely on:

- `items` is always an array, never null. Empty result → `[]` with `total: 0`.
- `total` is the count **after filters, before pagination**, for "showing 50 of 428"
  style UI and for knowing whether to paginate through everything.
- Sort is stable: ties on `sort` break on `created_at desc`, then `id`.
- To pull an entire month for aggregation, call with `start_date`/`end_date` and
  `limit=500`, then page on `offset` until `offset + len(items) >= total`.

### 5.2 Other transaction endpoints

**`POST /api/transactions`** — body `{ amount, date, category, description }`.
`user_id` is ignored if sent. Returns `201` with the created object (same shape as an `items` element).

**`PATCH /api/transactions/{id}`** — partial body, any of the four writable fields. Returns `200` + object.

**`DELETE /api/transactions/{id}`** — returns `204`.

**`POST /api/transactions/import`** — `multipart/form-data`, field name `file`. Returns `200`:

```json
{
  "imported": 182,
  "skipped": 3,
  "errors": [
    { "row": 47, "message": "unparseable date '31/02/2026'" }
  ],
  "detected_format": "dbs_posb"
}
```

`detected_format` is `generic` or `dbs_posb`. Duplicate detection is on
(`user_id`, `date`, `amount`, `description`) — exact matches are skipped, not inserted twice.

### 5.3 `GET /api/profile` / `PATCH /api/profile`

Returns `{ id, display_name, currency, created_at }`. `PATCH` accepts `display_name`, `currency`.

### 5.4 `/api/auth/*` — signup, login, refresh (unauthenticated)

The browser never talks to Supabase directly. These three endpoints call
Supabase's Auth REST API with the anon key server-side and hand back
whatever session Supabase issues. `get_current_user` / `db_for_user`
simply verify whatever bearer token shows up.

**`POST /api/auth/signup`** — body `{ email, password, display_name? }`. `201`:

```json
{
  "access_token": "…or null if email confirmation is required…",
  "refresh_token": "…or null…",
  "expires_at": 1732400000,
  "user": { "id": "8c2e1a55-…", "email": "a@example.com" },
  "needs_confirmation": false
}
```

**`POST /api/auth/login`** — body `{ email, password }`. `200`, same shape,
`needs_confirmation` always `false`.

**`POST /api/auth/refresh`** — body `{ refresh_token }`. `200`, same shape.
Used by the frontend to silently retry once on a `401` before logging out.

Auth failures (bad password, duplicate signup email, etc.) come back as
`401` with the usual `{ "detail": "…" }` envelope — not Supabase's raw error
shape.

### 5.5 Error envelope (all endpoints)

```json
{ "detail": "human readable message" }
```

`400` malformed · `401` bad/missing token · `404` not found or not yours ·
`422` validation failure · `500` unexpected.

---

## 6. RLS — identical policy on all five tables

Run this once per table. Without it, every user sees every user's data.

```sql
alter table transactions   enable row level security;
alter table profiles       enable row level security;
alter table budgets        enable row level security;
alter table savings_goals  enable row level security;
alter table subscriptions  enable row level security;

create policy "own rows" on transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- repeat verbatim for profiles, budgets, savings_goals, subscriptions
```

The FastAPI backend uses the **anon key plus the caller's JWT**, not the service-role key,
so RLS is enforced on the backend path too. Never introduce `SUPABASE_SERVICE_ROLE_KEY`
to "just make it work" — it silently disables every policy above.

---

## 7. Shared modules — do not reimplement these

Do not construct `Authorization` headers by hand; use the modules below.

| Path | Exports | Notes |
|---|---|---|
| `frontend/src/services/supabase.js` | `supabase` (singleton client) | **not currently used** — kept for future direct-Supabase features; auth/API calls go through the backend instead (see below) |
| `frontend/src/services/authStorage.js` | `getAccessToken`, `getRefreshToken`, `setTokens`, `clearTokens`, `AUTH_CHANGED_EVENT` | used by auth.jsx and api.js only — don't touch localStorage directly elsewhere |
| `frontend/src/services/auth.jsx` | `AuthProvider`, `useAuth()` | |
| `frontend/src/services/api.js` | `apiFetch(path, opts)` | |
| `frontend/src/services/categories.js` | `CATEGORIES`, `CATEGORY_LABELS` | |
| `frontend/src/components/ProtectedRoute.jsx` | `ProtectedRoute` | |
| `backend/app/auth.py` | `get_current_user`, `CurrentUser` | |
| `backend/app/supabase_client.py` | `db_for_user(user)` | |
| `backend/app/routers/auth.py` | `router` (mounted at `/api/auth`) | mounted in main.py; not imported directly elsewhere |

`useAuth()` returns `{ session, user, loading, signIn, signUp, signOut }`.
`signIn`/`signUp` call the backend rather than the Supabase SDK directly;
`session.access_token`/`user.{id,email}` are sourced from a decoded JWT in
localStorage rather than a live SDK session.

`apiFetch` attaches the bearer token, prefixes `/api`, parses JSON, and throws an
`ApiError` with `.status` and `.detail` on non-2xx. Usage:

```js
const data = await apiFetch("/transactions?start_date=2026-03-01&limit=500");
```

Backend usage:

```python
@router.get("/budgets")
def list_budgets(user: CurrentUser = Depends(get_current_user)):
    return db_for_user(user).table("budgets").select("*").execute().data
```

---

## 8. Demo data

`demo-data/transactions_seed.csv` — ~4 months, ~180 rows, every category represented,
realistic Singapore merchants, plausible salary cadence.
`demo-data/seed.py` — loads the CSV into the **currently logged-in user's** account via
`POST /api/transactions/import`. Safe to re-run against the same account — duplicates
are detected and skipped, not doubled.

---

## 9. Change log

| Date | Change |
|---|---|
| 2026-07-24 | Auth moved behind the backend: new `/api/auth/{signup,login,refresh}` (§5.4), new `frontend/src/services/authStorage.js`, `supabase.js` no longer used by the auth/API path, `VITE_SUPABASE_*` dropped from `frontend/.env.example`. `useAuth()`'s public shape is unchanged. |

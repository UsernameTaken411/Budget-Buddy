"""Load the shared demo dataset into YOUR OWN account.

Each of A, B and C runs this separately — RLS means your rows are invisible to
the others, so nobody can rely on a teammate having seeded.

    pip install httpx
    python demo-data/seed.py you@example.com yourpassword

Optional third arg is the API base (defaults to local dev):

    python demo-data/seed.py you@example.com pw https://your-app.azurecontainerapps.io/api

Reads SUPABASE_URL and SUPABASE_ANON_KEY from the environment or backend/.env.

Owner: Person A.
"""

from __future__ import annotations

import os
import pathlib
import sys

import httpx

HERE = pathlib.Path(__file__).resolve().parent
CSV_PATH = HERE / "transactions_seed.csv"


def load_env() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")

    if not (url and key):
        env_file = HERE.parent / "backend" / ".env"
        if env_file.exists():
            for line in env_file.read_text().splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                if k.strip() == "SUPABASE_URL" and not url:
                    url = v
                elif k.strip() == "SUPABASE_ANON_KEY" and not key:
                    key = v

    if not (url and key):
        sys.exit(
            "Missing SUPABASE_URL / SUPABASE_ANON_KEY.\n"
            "Set them in the environment or in backend/.env"
        )
    return url.rstrip("/"), key


def get_token(supabase_url: str, anon_key: str, email: str, password: str) -> str:
    resp = httpx.post(
        f"{supabase_url}/auth/v1/token",
        params={"grant_type": "password"},
        headers={"apikey": anon_key, "Content-Type": "application/json"},
        json={"email": email, "password": password},
        timeout=20.0,
    )
    if resp.status_code != 200:
        sys.exit(f"Login failed ({resp.status_code}): {resp.text}")
    token = resp.json().get("access_token")
    if not token:
        sys.exit("Login succeeded but no access_token came back.")
    return token


def main() -> None:
    if len(sys.argv) < 3:
        sys.exit(
            "Usage: python demo-data/seed.py <email> <password> [api_base]\n"
            "  api_base defaults to http://localhost:8000/api"
        )

    email, password = sys.argv[1], sys.argv[2]
    api_base = (sys.argv[3] if len(sys.argv) > 3 else "http://localhost:8000/api").rstrip("/")

    if not CSV_PATH.exists():
        sys.exit(f"Missing {CSV_PATH}. Run: python demo-data/generate.py")

    supabase_url, anon_key = load_env()

    print(f"Signing in as {email} ...")
    token = get_token(supabase_url, anon_key, email, password)

    print(f"Uploading {CSV_PATH.name} to {api_base}/transactions/import ...")
    with CSV_PATH.open("rb") as fh:
        resp = httpx.post(
            f"{api_base}/transactions/import",
            headers={"Authorization": f"Bearer {token}"},
            files={"file": (CSV_PATH.name, fh, "text/csv")},
            timeout=120.0,
        )

    if resp.status_code != 200:
        sys.exit(f"Import failed ({resp.status_code}): {resp.text}")

    result = resp.json()
    print(
        f"  imported: {result['imported']}\n"
        f"  skipped (already present): {result['skipped']}\n"
        f"  format detected: {result['detected_format']}"
    )
    if result.get("errors"):
        print(f"  {len(result['errors'])} row error(s):")
        for e in result["errors"][:10]:
            print(f"    row {e['row']}: {e['message']}")

    print("\nDone. Re-running is safe — duplicates are skipped, not doubled.")


if __name__ == "__main__":
    main()

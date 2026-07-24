"""Regenerates transactions_seed.csv. You normally don't need to run this —
the CSV is committed. Run it only if you want different demo data.

    python demo-data/generate.py

Owner: Person A.
"""

from __future__ import annotations

import csv
import random
from datetime import date, timedelta

random.seed(20260724)  # deterministic: everyone gets the same demo data

START = date(2026, 3, 1)
END = date(2026, 6, 30)

MERCHANTS = {
    "food": [
        ("Kopitiam Toa Payoh", 4.5, 9),
        ("Ya Kun Kaya Toast", 6, 12),
        ("McDonald's Orchard", 8, 16),
        ("Tim Ho Wan", 18, 34),
        ("foodpanda order", 15, 38),
        ("Starbucks Raffles", 6.5, 11),
        ("Hawker Chan", 5, 12),
        ("Din Tai Fung", 25, 48),
    ],
    "groceries": [
        ("NTUC FairPrice Clementi", 28, 95),
        ("Cold Storage Holland V", 35, 120),
        ("Sheng Siong", 22, 70),
        ("Giant Tampines", 30, 88),
    ],
    "transport": [
        ("Grab ride", 8, 26),
        ("SimplyGo MRT top-up", 20, 40),
        ("Gojek ride", 9, 24),
        ("Shell petrol", 55, 95),
        ("ComfortDelGro taxi", 12, 30),
    ],
    "shopping": [
        ("Shopee order", 15, 140),
        ("Lazada order", 20, 160),
        ("Uniqlo Bugis", 39, 120),
        ("Decathlon", 25, 95),
        ("IKEA Alexandra", 45, 210),
    ],
    "bills": [
        ("Singtel mobile", 42, 42),
        ("SP Group utilities", 85, 145),
        ("Town Council S&CC", 78, 78),
        ("Income insurance premium", 120, 120),
    ],
    "entertainment": [
        ("Netflix", 19.98, 19.98),
        ("Spotify Premium", 11.98, 11.98),
        ("Golden Village cinema", 13, 28),
        ("Steam purchase", 12, 60),
    ],
    "health": [
        ("Guardian Pharmacy", 12, 45),
        ("Watsons", 15, 52),
        ("Polyclinic consult", 15, 40),
        ("Dental checkup", 60, 180),
    ],
    "education": [
        ("Coursera subscription", 28, 28),
        ("Popular Bookstore", 18, 65),
        ("Udemy course", 15, 45),
    ],
    "travel": [
        ("Scoot flight booking", 180, 420),
        ("Klook activity", 45, 130),
        ("Agoda hotel", 160, 380),
    ],
}

# Roughly how many of each per month.
FREQUENCY = {
    "food": 22,
    "groceries": 6,
    "transport": 14,
    "shopping": 4,
    "bills": 4,
    "entertainment": 3,
    "health": 2,
    "education": 1,
    "travel": 0,  # added explicitly in one month only
}


def money(lo: float, hi: float) -> float:
    return round(random.uniform(lo, hi), 2)


def month_days(y: int, m: int) -> tuple[date, date]:
    first = date(y, m, 1)
    last = date(y + (m == 12), (m % 12) + 1, 1) - timedelta(days=1)
    return first, max(first, min(last, END))


def main() -> None:
    rows: list[tuple[str, str, float, str]] = []
    months = [(2026, 3), (2026, 4), (2026, 5), (2026, 6)]

    for y, m in months:
        first, last = month_days(y, m)
        span = (last - first).days

        # Salary on the 25th (or the last day if the month is truncated).
        pay_day = min(first + timedelta(days=24), last)
        rows.append(
            (pay_day.isoformat(), "ACME PTE LTD SALARY", 4200.00, "income")
        )

        # Occasional side income.
        if random.random() < 0.5:
            d = first + timedelta(days=random.randint(0, span))
            rows.append((d.isoformat(), "Freelance payment", money(300, 900), "income"))

        # Monthly transfer to savings.
        d = min(first + timedelta(days=26), last)
        rows.append((d.isoformat(), "Fund transfer own account", -500.00, "transfer"))

        for category, count in FREQUENCY.items():
            for _ in range(count):
                name, lo, hi = random.choice(MERCHANTS[category])
                d = first + timedelta(days=random.randint(0, span))
                rows.append((d.isoformat(), name, -money(lo, hi), category))

        # One travel splurge in May.
        if m == 5:
            for _ in range(3):
                name, lo, hi = random.choice(MERCHANTS["travel"])
                d = first + timedelta(days=random.randint(0, span))
                rows.append((d.isoformat(), name, -money(lo, hi), "travel"))

    rows.sort(key=lambda r: r[0])

    with open("demo-data/transactions_seed.csv", "w", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["date", "description", "amount", "category"])
        w.writerows(rows)

    print(f"wrote {len(rows)} rows")


if __name__ == "__main__":
    main()

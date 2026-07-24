"""Generic CSV importer.

Accepts a reasonably-shaped CSV with columns for date, description and amount,
tolerating common header spellings. Produces rows already normalized to the
SCHEMA.md §1 shape: signed amount, ISO date, closed-vocabulary category.

The DBS/POSB importer does NOT duplicate this logic — it normalizes a bank file
into the shape this module expects and then calls parse_rows().

Owner: Person A.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass
from datetime import date as Date
from datetime import datetime

CATEGORIES = {
    "food",
    "transport",
    "groceries",
    "shopping",
    "bills",
    "entertainment",
    "health",
    "education",
    "travel",
    "income",
    "transfer",
    "other",
}

# Header aliases -> canonical field. Lowercased, stripped, non-alnum removed.
_DATE_KEYS = {"date", "transactiondate", "valuedate", "postingdate", "txndate"}
_DESC_KEYS = {
    "description",
    "desc",
    "details",
    "transactiondetails",
    "reference",
    "merchant",
    "narrative",
    "particulars",
}
_AMOUNT_KEYS = {"amount", "value", "transactionamount", "amt"}
_CATEGORY_KEYS = {"category", "cat", "type", "categoryname"}

_DATE_FORMATS = (
    "%Y-%m-%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d %b %Y",
    "%d %B %Y",
    "%b %d, %Y",
    "%Y/%m/%d",
    "%d/%m/%y",
    "%m/%d/%Y",  # last resort; ambiguous with d/m/Y so it loses on purpose
)

# Merchant keyword -> category. Singapore-flavoured, deliberately small:
# anything unmatched becomes 'other' rather than inventing a category.
_MERCHANT_RULES: list[tuple[str, str]] = [
    (r"salary|payroll|monthly pay|wages", "income"),
    (r"ntuc|fairprice|cold storage|sheng siong|giant|prime super", "groceries"),
    (r"grab|gojek|comfort|smrt|sbs|transit|bus/mrt|ez-link|ezlink|shell|esso|spc|caltex", "transport"),
    (r"kopitiam|hawker|mcdonald|kfc|starbucks|toast box|ya kun|subway|burger|pizza|restaurant|cafe|coffee|foodpanda|deliveroo", "food"),
    (r"shopee|lazada|amazon|uniqlo|zara|h&m|taobao|decathlon|ikea", "shopping"),
    (r"singtel|starhub|m1|sp group|sp services|pub|town council|insurance|premium|utilities", "bills"),
    (r"netflix|spotify|disney|cathay|golden village|shaw|steam|playstation|cinema", "entertainment"),
    (r"guardian|watsons|unity|polyclinic|clinic|dental|hospital|pharmacy", "health"),
    (r"coursera|udemy|tuition|school|university|bookstore|popular", "education"),
    (r"airbnb|scoot|singapore airlines|jetstar|klook|agoda|booking\.com|hotel", "travel"),
    (r"transfer|paynow|giro|fund transfer|own account", "transfer"),
]


@dataclass
class ParsedRow:
    date: Date
    description: str
    amount: float
    category: str


@dataclass
class RowError:
    row: int
    message: str


def _norm_key(k: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (k or "").strip().lower())


def parse_date(raw: str) -> Date:
    """Try the known formats in order. Raises ValueError with the raw value."""
    s = (raw or "").strip()
    if not s:
        raise ValueError("empty date")
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"unparseable date {s!r}")


def parse_amount(raw: str) -> float:
    """Handle 1,234.56 / (12.34) negatives / SGD prefixes / trailing CR-DR."""
    s = (raw or "").strip()
    if not s:
        raise ValueError("empty amount")

    negative = False

    # Accounting-style parentheses mean negative.
    if s.startswith("(") and s.endswith(")"):
        negative = True
        s = s[1:-1]

    # Trailing CR/DR markers.
    upper = s.upper()
    if upper.endswith("DR"):
        negative = True
        s = s[:-2]
    elif upper.endswith("CR"):
        s = s[:-2]

    s = re.sub(r"(?i)(sgd|s\$|\$|usd)", "", s)
    s = s.replace(",", "").replace(" ", "")

    if s.startswith("-"):
        negative = True
        s = s[1:]
    elif s.startswith("+"):
        s = s[1:]

    if not s:
        raise ValueError("empty amount")

    try:
        value = float(s)
    except ValueError as exc:
        raise ValueError(f"unparseable amount {raw.strip()!r}") from exc

    value = round(value, 2)
    return -value if negative else value


def infer_category(description: str, explicit: str | None = None) -> str:
    """Explicit category wins if it is in the vocabulary; else guess; else 'other'."""
    if explicit:
        candidate = _norm_key(explicit)
        if candidate in CATEGORIES:
            return candidate

    text = (description or "").lower()
    for pattern, category in _MERCHANT_RULES:
        if re.search(pattern, text):
            return category
    return "other"


def sniff_columns(fieldnames: list[str]) -> dict[str, str | None]:
    """Map canonical field -> actual header name present in the file."""
    mapping: dict[str, str | None] = {
        "date": None,
        "description": None,
        "amount": None,
        "category": None,
    }
    for name in fieldnames or []:
        key = _norm_key(name)
        if key in _DATE_KEYS and mapping["date"] is None:
            mapping["date"] = name
        elif key in _DESC_KEYS and mapping["description"] is None:
            mapping["description"] = name
        elif key in _AMOUNT_KEYS and mapping["amount"] is None:
            mapping["amount"] = name
        elif key in _CATEGORY_KEYS and mapping["category"] is None:
            mapping["category"] = name
    return mapping


def parse_rows(text: str) -> tuple[list[ParsedRow], list[RowError]]:
    """Parse a clean CSV into rows + per-row errors. Never raises on bad rows."""
    reader = csv.DictReader(io.StringIO(text))
    cols = sniff_columns(reader.fieldnames or [])

    if not cols["date"] or not cols["amount"]:
        raise ValueError(
            "CSV needs at least a date column and an amount column. "
            f"Found headers: {reader.fieldnames}"
        )

    rows: list[ParsedRow] = []
    errors: list[RowError] = []

    # Row numbering is 1-based on the header, so data starts at 2 — matches
    # what the user sees in Excel.
    for i, raw in enumerate(reader, start=2):
        try:
            d = parse_date(raw.get(cols["date"], ""))
            amount = parse_amount(raw.get(cols["amount"], ""))
            if amount == 0:
                raise ValueError("amount is zero")
            desc = (raw.get(cols["description"]) or "").strip() if cols["description"] else ""
            desc = re.sub(r"\s+", " ", desc)[:500]
            explicit = raw.get(cols["category"]) if cols["category"] else None
            rows.append(
                ParsedRow(
                    date=d,
                    description=desc,
                    amount=amount,
                    category=infer_category(desc, explicit),
                )
            )
        except ValueError as exc:
            errors.append(RowError(row=i, message=str(exc)))

    return rows, errors

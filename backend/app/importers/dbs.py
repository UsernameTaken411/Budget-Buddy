"""DBS / POSB statement CSV support.

This is a PREPROCESSOR, not a second parser. It normalizes a bank export into
the clean `date,description,amount` shape that importers.generic understands,
then hands off. If you find yourself duplicating date/amount parsing here,
stop — fix it in generic.py instead.

What a real DBS/POSB export looks like:

    Account Details For:
    Account Number,123-45678-9
    Statement Period,01 Jan 2026 To 31 Mar 2026
    Currency,SGD
    <blank line>
    Transaction Date,Reference,Debit Amount,Credit Amount,Transaction Ref1,Transaction Ref2,Transaction Ref3
    14 Mar 2026,ICT, 12.50 , ,KOPITIAM,PAYNOW,
    25 Mar 2026,SAL, , 4200.00 ,ACME PTE LTD,SALARY,

Three things that break a naive parser:
  1. Several preamble lines before the real header row.
  2. Separate Debit/Credit columns instead of one signed Amount column.
  3. Description split across Transaction Ref1/2/3, often padded with spaces.

Owner: Person A.
"""

from __future__ import annotations

import csv
import io
import re

# If any of these appear in the first ~15 lines, treat it as a DBS/POSB export.
_PREAMBLE_MARKERS = (
    "account details for",
    "account number",
    "statement period",
    "available balance",
)

_HEADER_MARKERS = ("transaction date", "debit amount", "credit amount")

_REF_HEADER_RE = re.compile(r"^transaction\s*ref\s*\d*$", re.IGNORECASE)


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def detect(text: str) -> bool:
    """True if this looks like a DBS/POSB statement export."""
    head = text[:4000].lower()

    if any(marker in head for marker in _PREAMBLE_MARKERS):
        return True

    # Some exports skip the preamble but keep the debit/credit header shape.
    for line in text.splitlines()[:15]:
        low = line.lower()
        if "debit amount" in low and "credit amount" in low:
            return True
    return False


_THOUSANDS_SPLIT_RE = re.compile(r"^\s*\d{1,3}$")
_THOUSANDS_TAIL_RE = re.compile(r"^\d{3}(?:\.\d+)?\s*$")


def _repair_thousands(row: list[str]) -> list[str]:
    """Rejoin amounts that csv split on their thousands separator.

    DBS quotes most fields but NOT amounts, so ` 4,200.00 ` arrives as two
    cells: ` 4` and `200.00 `. Left unrepaired this shifts every later column
    and silently turns a $4,200 salary into $4 — money wrong, no error raised.
    """
    out: list[str] = []
    i = 0
    while i < len(row):
        cur = row[i]
        if (
            i + 1 < len(row)
            and _THOUSANDS_SPLIT_RE.match(cur or "")
            and _THOUSANDS_TAIL_RE.match(row[i + 1] or "")
        ):
            merged = f"{cur.strip()}{row[i + 1].strip()}"
            # Keep consuming further 3-digit groups: 1,234,567.00
            i += 2
            while i < len(row) and _THOUSANDS_TAIL_RE.match(row[i] or ""):
                merged += row[i].strip()
                i += 1
            out.append(merged)
            continue
        out.append(cur)
        i += 1
    return out


def _find_header_index(lines: list[str]) -> int:
    """Index of the real header row. Raises ValueError if there isn't one."""
    for i, line in enumerate(lines[:40]):
        low = line.lower()
        hits = sum(1 for m in _HEADER_MARKERS if m in low)
        if hits >= 2:
            return i
        # Fallback: a date-ish first column plus a debit column.
        if "transaction date" in low and "," in line:
            return i
    raise ValueError(
        "Could not find the transaction header row in this DBS/POSB file. "
        "Expected a line containing 'Transaction Date' and 'Debit Amount'."
    )


def normalize(text: str) -> str:
    """DBS/POSB CSV -> clean `date,description,amount` CSV.

    Debit becomes negative, credit becomes positive — SCHEMA.md §1.
    """
    lines = text.splitlines()
    start = _find_header_index(lines)

    body = "\n".join(lines[start:])
    reader = csv.reader(io.StringIO(body))

    try:
        header = next(reader)
    except StopIteration as exc:
        raise ValueError("DBS/POSB file has a header but no rows.") from exc

    norm_header = [_norm(h) for h in header]

    def col(*names: str) -> int | None:
        for name in names:
            if name in norm_header:
                return norm_header.index(name)
        return None

    i_date = col("transaction date", "value date", "date")
    i_debit = col("debit amount", "withdrawal", "debit")
    i_credit = col("credit amount", "deposit", "credit")

    if i_date is None:
        raise ValueError("DBS/POSB file has no transaction date column.")
    if i_debit is None and i_credit is None:
        raise ValueError("DBS/POSB file has neither a debit nor a credit column.")

    # Description is whatever Transaction Ref columns exist, plus Reference.
    ref_indices = [i for i, h in enumerate(norm_header) if _REF_HEADER_RE.match(h)]
    if not ref_indices:
        fallback = col("reference", "description", "particulars")
        ref_indices = [fallback] if fallback is not None else []

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["date", "description", "amount"])

    def cell(row: list[str], idx: int | None) -> str:
        if idx is None or idx >= len(row):
            return ""
        return (row[idx] or "").strip()

    for row in reader:
        if not row or not any((c or "").strip() for c in row):
            continue  # blank separator lines are common at the end

        # Repair before reading any column by index, or the indices are wrong.
        if len(row) > len(header):
            row = _repair_thousands(row)

        date_raw = cell(row, i_date)
        if not date_raw:
            continue

        debit = cell(row, i_debit).replace(",", "")
        credit = cell(row, i_credit).replace(",", "")

        # Debit -> negative, credit -> positive. Exactly one is normally filled.
        if debit:
            amount = f"-{debit.lstrip('-')}"
        elif credit:
            amount = credit.lstrip("+")
        else:
            continue  # no money moved on this line; skip rather than error

        parts = [cell(row, i) for i in ref_indices]
        description = re.sub(r"\s+", " ", " ".join(p for p in parts if p)).strip()

        writer.writerow([date_raw, description, amount])

    return out.getvalue()

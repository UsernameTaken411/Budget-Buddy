from app.routers.transactions import parse_bank_csv


def test_parses_debit_credit_bank_statement():
    rows, errors, headers = parse_bank_csv(
        "Posting Date,Description,Debit,Credit,Currency\n"
        "24/07/2026,FAIRPRICE FINEST,68.45,,SGD\n"
        "23/07/2026,SALARY,,4200.00,SGD\n"
    )
    assert not errors
    assert "posting_date" in headers
    assert rows[0]["merchant"] == "FAIRPRICE FINEST"
    assert rows[0]["amount"] == "68.45"
    assert rows[0]["transaction_type"] == "expense"
    assert rows[0]["transaction_date"] == "2026-07-24"
    assert rows[1]["transaction_type"] == "income"


def test_parses_signed_amount_and_semicolon_delimiter():
    rows, errors, _ = parse_bank_csv(
        "Date;Transaction Description;Amount\n"
        "2026-07-20;KFC CHINATOWN;-14.90\n"
    )
    assert not errors
    assert rows[0]["merchant"] == "KFC CHINATOWN"
    assert rows[0]["amount"] == "14.90"
    assert rows[0]["transaction_type"] == "expense"


def test_reports_bad_rows_without_rejecting_valid_rows():
    rows, errors, _ = parse_bank_csv(
        "Date,Description,Withdrawal\n"
        "not-a-date,Broken,10\n"
        "24/07/2026,Bus,2.20\n"
    )
    assert len(rows) == 1
    assert len(errors) == 1
    assert errors[0]["row"] == 2

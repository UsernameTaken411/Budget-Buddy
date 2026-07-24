from app.receipt_ai import RECEIPT_PROMPT


def test_receipt_prompt_prioritizes_final_total_labels():
    assert '"TOTAL"' in RECEIPT_PROMPT
    assert '"AMOUNT DUE"' in RECEIPT_PROMPT
    assert '"SUBTOTAL"' in RECEIPT_PROMPT
    assert '"CHANGE"' in RECEIPT_PROMPT
    assert "largest or last number" in RECEIPT_PROMPT


def test_receipt_prompt_normalizes_customer_facing_merchant_names():
    assert '"Cheers"' in RECEIPT_PROMPT
    assert '"FairPrice"' in RECEIPT_PROMPT
    assert "customer-facing storefront brand" in RECEIPT_PROMPT
    assert "not the legal company name" in RECEIPT_PROMPT

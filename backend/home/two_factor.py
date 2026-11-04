import base64
import io
import secrets
import unicodedata

import pyotp
import qrcode
from django.contrib.auth.hashers import check_password, make_password


def normalize_auth_code(raw_code: str) -> str:
    normalized_chars = []
    for ch in str(raw_code or "").strip():
        if ch.isdigit():
            # Normalize locale-specific digits (e.g. Persian/Arabic) to ASCII.
            try:
                normalized_chars.append(str(unicodedata.digit(ch)))
                continue
            except (TypeError, ValueError):
                pass
        if ch.isalnum():
            normalized_chars.append(ch)
    return "".join(normalized_chars).upper()


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def build_totp_uri(secret: str, *, account_name: str, issuer: str = "BazarAF") -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=account_name, issuer_name=issuer)


def build_qr_data_url(payload: str) -> str:
    image = qrcode.make(payload)
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def verify_totp(secret: str, code: str) -> bool:
    if not secret:
        return False
    normalized = normalize_auth_code(code)
    if not (normalized.isdigit() and len(normalized) == 6):
        return False
    # Allow a small clock-skew buffer to avoid false negatives at boundaries.
    return bool(pyotp.TOTP(secret).verify(normalized, valid_window=2))


def generate_backup_codes(count: int = 8) -> list[str]:
    codes: list[str] = []
    for _ in range(count):
        # 4-4 format for easier manual entry.
        part_a = secrets.token_hex(2).upper()
        part_b = secrets.token_hex(2).upper()
        codes.append(f"{part_a}-{part_b}")
    return codes


def hash_backup_codes(plain_codes: list[str]) -> list[str]:
    return [make_password(normalize_auth_code(code)) for code in plain_codes]


def consume_backup_code(raw_code: str, hashed_codes: list[str]) -> tuple[bool, list[str]]:
    normalized = normalize_auth_code(raw_code)
    if not normalized:
        return False, hashed_codes

    next_hashes: list[str] = []
    consumed = False
    for code_hash in hashed_codes:
        if not consumed and check_password(normalized, code_hash):
            consumed = True
            continue
        next_hashes.append(code_hash)

    return consumed, next_hashes
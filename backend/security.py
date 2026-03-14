import hashlib
import hmac
import secrets
from datetime import datetime, timezone


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _pbkdf2_hash(password: str, *, salt: bytes) -> str:
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 210_000)
    return dk.hex()


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = _pbkdf2_hash(password, salt=salt)
    return f"pbkdf2_sha256${salt.hex()}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algo, salt_hex, digest_hex = stored.split("$", 2)
        if algo != "pbkdf2_sha256":
            return False
        salt = bytes.fromhex(salt_hex)
        computed = _pbkdf2_hash(password, salt=salt)
        return hmac.compare_digest(computed, digest_hex)
    except Exception:
        return False

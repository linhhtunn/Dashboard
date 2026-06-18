import jwt

from app.core.config import Settings
from app.security import _decode_supabase_jwt


def test_decode_supabase_jwt_uses_hs256_secret() -> None:
    secret = "test-secret-with-at-least-thirty-two-bytes"
    settings = Settings(SUPABASE_JWT_SECRET=secret)
    token = jwt.encode(
        {
            "sub": "user-1",
            "email": "doctor@example.com",
            "aud": "authenticated",
            "user_metadata": {"role": "doctor", "department": "cardiology"},
        },
        secret,
        algorithm="HS256",
    )

    payload = _decode_supabase_jwt(token, settings)

    assert payload["sub"] == "user-1"
    assert payload["user_metadata"]["role"] == "doctor"


def test_decode_supabase_jwt_uses_jwks_for_es256(monkeypatch) -> None:
    settings = Settings(
        SUPABASE_URL="https://example.supabase.co",
        SUPABASE_JWKS_URL="https://example.supabase.co/auth/v1/.well-known/jwks.json",
    )
    calls = {}

    class FakeSigningKey:
        key = "public-key"

    class FakeJWKClient:
        def __init__(self, url: str) -> None:
            calls["url"] = url

        def get_signing_key_from_jwt(self, token: str) -> FakeSigningKey:
            calls["token"] = token
            return FakeSigningKey()

    def fake_decode(token, key, algorithms, audience):
        calls["decode"] = {
            "token": token,
            "key": key,
            "algorithms": algorithms,
            "audience": audience,
        }
        return {"sub": "user-1", "aud": "authenticated"}

    monkeypatch.setattr(jwt, "get_unverified_header", lambda token: {"alg": "ES256"})
    monkeypatch.setattr(jwt, "PyJWKClient", FakeJWKClient)
    monkeypatch.setattr(jwt, "decode", fake_decode)

    payload = _decode_supabase_jwt("token-value", settings)

    assert payload["sub"] == "user-1"
    assert calls["url"] == "https://example.supabase.co/auth/v1/.well-known/jwks.json"
    assert calls["token"] == "token-value"
    assert calls["decode"]["key"] == "public-key"
    assert calls["decode"]["algorithms"] == ["ES256"]
    assert calls["decode"]["audience"] == "authenticated"

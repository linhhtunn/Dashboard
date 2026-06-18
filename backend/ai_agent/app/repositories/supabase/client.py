from __future__ import annotations

from typing import Any

import httpx


class SupabaseRestClient:
    def __init__(self, supabase_url: str, service_key: str) -> None:
        self.base_url = supabase_url.rstrip("/")
        self.service_key = service_key

    def select(self, table: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        url = f"{self.base_url}/rest/v1/{table}"
        headers = {
            "apikey": self.service_key,
            "Authorization": f"Bearer {self.service_key}",
            "Accept": "application/json",
        }
        with httpx.Client(timeout=10.0) as client:
            response = client.get(url, headers=headers, params=params)
        if response.status_code in {404, 406}:
            return []
        response.raise_for_status()
        payload = response.json()
        return payload if isinstance(payload, list) else []

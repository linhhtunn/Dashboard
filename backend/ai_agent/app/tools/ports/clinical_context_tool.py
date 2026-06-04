from __future__ import annotations

from typing import Protocol

from app.contracts import ToolResponse
from app.tools.base import ToolContext, ToolRequest


class ClinicalContextTool(Protocol):
    name: str
    description: str

    async def run(
        self,
        request: ToolRequest,
        context: ToolContext | None = None,
    ) -> ToolResponse:
        """Fetch reusable clinical context without exposing persistence details."""

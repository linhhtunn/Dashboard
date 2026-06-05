from __future__ import annotations

from dataclasses import dataclass, field

from app.contracts import ToolResponse, tool_not_found
from app.tools.base import Tool, ToolContext, ToolRequest


class ToolRegistrationError(ValueError):
    """Raised when the tool registry cannot accept a tool."""


@dataclass
class ToolRegistry:
    _tools: dict[str, Tool] = field(default_factory=dict)

    def register(self, tool: Tool) -> None:
        if not tool.name:
            raise ToolRegistrationError("Tool name must not be empty")
        if tool.name in self._tools:
            raise ToolRegistrationError(f"Tool already registered: {tool.name}")
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def names(self) -> list[str]:
        return sorted(self._tools)

    async def run(
        self,
        request: ToolRequest,
        context: ToolContext | None = None,
    ) -> ToolResponse:
        tool = self.get(request.name)
        if tool is None:
            return tool_not_found(
                tool_name=request.name,
                message=f"Tool is not registered: {request.name}",
            )
        return await tool.run(request, context)

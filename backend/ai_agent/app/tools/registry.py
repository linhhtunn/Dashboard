from __future__ import annotations

from dataclasses import dataclass, field
from time import perf_counter

from app.contracts import ToolResponse, tool_not_found
from app.observability import observe
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
        with observe(
            name=f"tool.{request.name}",
            as_type="tool",
            metadata={
                "tool_name": request.name,
                "patient_id": context.patient_id if context else request.arguments.get("patient_id"),
                "conversation_id": context.conversation_id if context else None,
                "intent": (context.metadata or {}).get("intent") if context else None,
            },
            input={
                "tool_name": request.name,
                "arguments": request.arguments,
                "context": {
                    "patient_id": context.patient_id if context else None,
                    "conversation_id": context.conversation_id if context else None,
                    "metadata": context.metadata if context else {},
                },
            },
        ) as span:
            started_at = perf_counter()
            tool = self.get(request.name)
            if tool is None:
                response = tool_not_found(
                    tool_name=request.name,
                    message=f"Tool is not registered: {request.name}",
                )
                span.update(
                    metadata={
                        "status": response.status.value,
                        "latency_ms": _elapsed_ms(started_at),
                    },
                    output=_tool_trace_output(response),
                )
                return response
            response = await tool.run(request, context)
            span.update(
                metadata={
                    "status": response.status.value,
                    "data_availability": response.data.get("data_availability", {}),
                    "candidate_count": _count_list(response.data.get("patients")),
                    "action_count": _count_list(response.data.get("actions")),
                    "latency_ms": _elapsed_ms(started_at),
                },
                output=_tool_trace_output(response),
            )
            return response


def _count_list(value: object) -> int:
    return len(value) if isinstance(value, list) else 0


def _elapsed_ms(started_at: float) -> float:
    return round((perf_counter() - started_at) * 1000, 2)


def _tool_trace_output(response: ToolResponse) -> dict:
    return {
        "tool_name": response.tool_name,
        "status": response.status.value,
        "message": response.message,
        "data": response.data,
    }

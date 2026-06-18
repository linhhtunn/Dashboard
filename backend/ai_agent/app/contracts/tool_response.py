from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ToolStatus(str, Enum):
    SUCCESS = "success"
    NOT_FOUND = "not-found"
    ERROR = "error"


@dataclass(frozen=True)
class ToolResponse:
    tool_name: str
    status: ToolStatus
    data: dict[str, Any] = field(default_factory=dict)
    message: str = ""

    @property
    def ok(self) -> bool:
        return self.status == ToolStatus.SUCCESS


def tool_success(
    *,
    tool_name: str,
    data: dict[str, Any],
    message: str = "",
) -> ToolResponse:
    return ToolResponse(
        tool_name=tool_name,
        status=ToolStatus.SUCCESS,
        data=data,
        message=message,
    )


def tool_not_found(
    *,
    tool_name: str,
    message: str,
) -> ToolResponse:
    return ToolResponse(
        tool_name=tool_name,
        status=ToolStatus.NOT_FOUND,
        message=message,
    )


def tool_error(
    *,
    tool_name: str,
    message: str,
    data: dict[str, Any] | None = None,
) -> ToolResponse:
    return ToolResponse(
        tool_name=tool_name,
        status=ToolStatus.ERROR,
        data=data or {},
        message=message,
    )

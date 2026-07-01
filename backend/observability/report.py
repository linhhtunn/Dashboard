from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class EvaluationReport:
    run_id: str
    status: str
    summary: dict[str, Any]
    output_dir: Path

    def write(self) -> dict[str, str]:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        json_path = self.output_dir / f"{self.run_id}_summary.json"
        md_path = self.output_dir / f"{self.run_id}_summary.md"
        json_path.write_text(json.dumps(self.summary, indent=2, sort_keys=True, default=str), encoding="utf-8")
        md_path.write_text(self._markdown(), encoding="utf-8")
        return {"json": str(json_path), "markdown": str(md_path)}

    def _markdown(self) -> str:
        lines = [
            f"# Realtime Evaluation Report: {self.run_id}",
            "",
            f"Status: **{self.status.upper()}**",
            "",
            "## Summary",
        ]
        for key, value in self.summary.items():
            if key == "latency_summary":
                continue
            lines.append(f"- `{key}`: `{value}`")
        latency_summary = self.summary.get("latency_summary")
        if isinstance(latency_summary, dict) and latency_summary:
            lines.extend(
                [
                    "",
                    "## Latency Summary",
                    "",
                    "| Metric | Count | Avg ms | P50 ms | P95 ms | P99 ms | Max ms |",
                    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
                ]
            )
            for metric, stats in sorted(latency_summary.items()):
                if not isinstance(stats, dict):
                    continue
                lines.append(
                    "| {metric} | {count} | {avg:.2f} | {p50:.2f} | {p95:.2f} | {p99:.2f} | {maxv:.2f} |".format(
                        metric=metric,
                        count=int(stats.get("count", 0)),
                        avg=float(stats.get("avg_ms", 0)),
                        p50=float(stats.get("p50_ms", 0)),
                        p95=float(stats.get("p95_ms", 0)),
                        p99=float(stats.get("p99_ms", 0)),
                        maxv=float(stats.get("max_ms", 0)),
                    )
                )
        lines.extend(
            [
                "",
                "## Meaning",
                "Use this run to compare end-to-end alert delivery latency, queue backlog, duplicate/missed alerts, and whether scale warnings appeared.",
                "",
                "See `backend/observability/docs/realtime_success_metrics.md` for metric definitions and thresholds.",
            ]
        )
        return "\n".join(lines) + "\n"

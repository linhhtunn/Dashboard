import re
from typing import Any

def validate_and_format_citations(narrative_summary: str, tool_output: dict[str, Any] | None) -> str:
    """
    Parses citation markers like [1], [2] in the narrative_summary,
    validates that they correspond to actual retrieved search results,
    removes any invalid citation markers, and appends the formatted
    sources as markdown links to the end of the narrative_summary.

    If no search results are available, returns the required exact fallback string:
    "Tôi không tìm thấy bằng chứng y văn chính thống cho câu hỏi này từ các nguồn được cấu hình."
    """
    raw_results = []
    if tool_output and isinstance(tool_output, dict):
        data = tool_output.get("data")
        if isinstance(data, dict):
            raw_results = data.get("raw_search_results") or []

    # Enforce exact fallback if no search results are available
    if not raw_results:
        return "Tôi không tìm thấy bằng chứng y văn chính thống cho câu hỏi này từ các nguồn được cấu hình."

    # Pattern matches optional leading space + [N]
    pattern = re.compile(r"\s*\[(\d+)\]")
    valid_citations = {}

    def replace_citation(match: re.Match) -> str:
        idx_str = match.group(1)
        idx = int(idx_str)
        if 1 <= idx <= len(raw_results):
            # It's a valid index. Record it.
            res = raw_results[idx - 1]
            valid_citations[idx] = res
            return match.group(0)  # Preserve original text (with space/brackets)
        else:
            # Invalid/hallucinated citation index. Remove it.
            return ""

    cleaned_summary = pattern.sub(replace_citation, narrative_summary)

    # Clean up duplicate/extra spaces that might have been left by removing citations
    cleaned_summary = re.sub(r" {2,}", " ", cleaned_summary)
    cleaned_summary = re.sub(r"\s+([.,;?!)] )", r"\1", cleaned_summary)

    # Append bibliography if there are valid citations
    if valid_citations:
        sorted_indices = sorted(valid_citations.keys())
        bib_lines = ["", "Tài liệu tham khảo:"]
        for idx in sorted_indices:
            res = valid_citations[idx]
            title = res.get("title") or "Tài liệu tham khảo"
            url = res.get("url") or "#"
            bib_lines.append(f"- [{idx}] [{title}]({url})")
        
        cleaned_summary = cleaned_summary.strip() + "\n" + "\n".join(bib_lines)

    return cleaned_summary

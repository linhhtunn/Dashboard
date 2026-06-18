from abc import ABC, abstractmethod
from typing import Any, List
from app.services.clinical.rule_engine import RuleEngine

class GuidelineRetriever(ABC):
    """Abstract base class for clinical guideline/evidence retrieval."""

    @abstractmethod
    async def retrieve(
        self,
        query: str,
        clinical_features: dict[str, Any],
        triggered_rules: List[dict[str, Any]],
    ) -> List[str]:
        """Retrieve explanation/evidence texts based on context and triggered rules."""
        pass


class RuleBasedRetriever(GuidelineRetriever):
    """Rule-based clinical guideline retriever extracting citations from YAML rules."""

    def __init__(self, rule_engine: RuleEngine) -> None:
        self.rule_engine = rule_engine

    async def retrieve(
        self,
        query: str,
        clinical_features: dict[str, Any],
        triggered_rules: List[dict[str, Any]],
    ) -> List[str]:
        evidence = []

        # 1. Process explicit triggered rules if provided
        for rule in triggered_rules:
            # If it is an override rule
            if rule.get("category") == "override" or ("action" in rule and rule["action"].get("type") == "override"):
                source = rule.get("clinical_source") or rule.get("metadata", {}).get("clinical_source") or "Drug Safety Database"
                reason = rule.get("reason") or rule.get("action", {}).get("reason")
                if reason:
                    evidence.append(f"Safety Source: {source} - {reason}")
            # If it is a standard recommendation rule
            elif "condition" in rule and "outcomes" in rule:
                if self.rule_engine._evaluate_condition(rule["condition"], clinical_features):
                    source = rule.get("metadata", {}).get("clinical_source", "Clinical Guideline")
                    for outcome in rule["outcomes"]:
                        if self.rule_engine._evaluate_condition(outcome.get("when"), clinical_features):
                            recs = outcome.get("recommend", [])
                            evidence.append(f"Guideline Source: {source} (Recommends: {', '.join(recs)})")

        # 2. Fallback: If no evidence was populated (triggered_rules list empty/missing), evaluate on the fly
        if not evidence:
            for rule in self.rule_engine.rules:
                if "condition" in rule and "outcomes" in rule:
                    if self.rule_engine._evaluate_condition(rule["condition"], clinical_features):
                        source = rule.get("metadata", {}).get("clinical_source", "Clinical Guideline")
                        for outcome in rule["outcomes"]:
                            if self.rule_engine._evaluate_condition(outcome.get("when"), clinical_features):
                                recs = outcome.get("recommend", [])
                                evidence.append(f"Guideline Source: {source} (Recommends: {', '.join(recs)})")

            overrides = self.rule_engine.evaluate_overrides(clinical_features)
            for o in overrides:
                source = o.get("clinical_source") or "Drug Safety Database"
                reason = o.get("reason")
                if reason:
                    evidence.append(f"Safety Source: {source} - {reason}")

        return list(dict.fromkeys(evidence))

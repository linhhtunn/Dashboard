import os
import glob
import yaml
import logging
from typing import Any

logger = logging.getLogger(__name__)

class RuleEngine:
    def __init__(self, rule_directory: str) -> None:
        self.rule_directory = rule_directory
        self.rules = []

    def load_rules(self) -> None:
        """
        Load all YAML files from self.rule_directory.
        Parse versioning, priority, and metadata.
        """
        self.rules = []
        pattern = os.path.join(self.rule_directory, "**", "*.yaml")
        yaml_files = glob.glob(pattern, recursive=True)

        # Also search for .yml files just in case
        pattern_yml = os.path.join(self.rule_directory, "**", "*.yml")
        yaml_files.extend(glob.glob(pattern_yml, recursive=True))

        for filepath in yaml_files:
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    rule_content = yaml.safe_load(f)
                    if rule_content:
                        self.rules.append(rule_content)
                        logger.info("loaded_clinical_rule_file path=%s", filepath)
            except Exception as exc:
                logger.error("failed_to_load_yaml_rule path=%s reason=%s", filepath, exc, exc_info=True)

    def _evaluate_condition(self, condition: Any, features: dict[str, Any]) -> bool:
        if not condition:
            return True

        if isinstance(condition, dict):
            if "all" in condition:
                return all(self._evaluate_condition(c, features) for c in condition["all"])
            if "any" in condition:
                return any(self._evaluate_condition(c, features) for c in condition["any"])
            if "not" in condition:
                return not self._evaluate_condition(condition["not"], features)
            
            # Base condition: field, operator, value
            field = condition.get("field")
            operator = condition.get("operator")
            value = condition.get("value")
            
            if field is None or operator is None:
                return False
                
            actual = features.get(field)
            if actual is None:
                return False
                
            # Perform comparison
            try:
                if operator == "eq":
                    return str(actual).strip().lower() == str(value).strip().lower()
                elif operator == "neq":
                    return str(actual).strip().lower() != str(value).strip().lower()
                elif operator == "gt":
                    return float(actual) > float(value)
                elif operator == "gte":
                    return float(actual) >= float(value)
                elif operator == "lt":
                    return float(actual) < float(value)
                elif operator == "lte":
                    return float(actual) <= float(value)
                elif operator == "in":
                    if isinstance(value, list):
                        return any(str(actual).strip().lower() == str(v).strip().lower() for v in value)
                    return str(value).strip().lower() in str(actual).strip().lower()
                elif operator == "contains":
                    if isinstance(actual, list):
                        return any(str(v).strip().lower() == str(value).strip().lower() for v in actual)
                    return str(value).strip().lower() in str(actual).strip().lower()
                elif operator == "between":
                    if isinstance(value, list) and len(value) == 2:
                        return float(value[0]) <= float(actual) <= float(value[1])
            except (ValueError, TypeError):
                return False

        return False

    def evaluate_overrides(self, clinical_features: dict[str, Any]) -> list[dict[str, Any]]:
        """
        Evaluate override/safety rules in the rules list format (e.g. from contraindication.yaml).
        Returns a list of matched override dictionaries with action, reason, and metadata.
        """
        if not self.rules:
            self.load_rules()

        matched_overrides = []
        for rule in self.rules:
            if "rules" in rule and isinstance(rule["rules"], list):
                for sub_rule in rule["rules"]:
                    if "condition" in sub_rule and "action" in sub_rule:
                        if self._evaluate_condition(sub_rule["condition"], clinical_features):
                            matched_overrides.append({
                                "id": sub_rule.get("id"),
                                "action": sub_rule["action"],
                                "reason": sub_rule["action"].get("reason"),
                                "clinical_source": rule.get("metadata", {}).get("clinical_source")
                            })
        return matched_overrides

    def evaluate_initial_recommendations(self, clinical_features: dict[str, Any]) -> list[str]:
        """
        Match clinical features against YAML rule conditions to get initial drug recommendations.
        """
        if not self.rules:
            self.load_rules()

        recommendations = []
        for rule in self.rules:
            # We look for files matching the anticoagulation format
            # Specifically, if it has 'condition' and 'outcomes'
            if "condition" in rule and "outcomes" in rule:
                if self._evaluate_condition(rule["condition"], clinical_features):
                    for outcome in rule["outcomes"]:
                        if self._evaluate_condition(outcome.get("when"), clinical_features):
                            recommendations.extend(outcome.get("recommend", []))
                            
        return list(dict.fromkeys(recommendations))

    def evaluate(self, clinical_features: dict[str, Any]) -> list[str]:
        """
        Match clinical features against YAML rule conditions.
        Evaluate conditional trees (all, any, not).
        Output: List of recommended drugs/interventions after applying overrides.
        """
        recommendations = self.evaluate_initial_recommendations(clinical_features)

        # Apply override rules dynamically
        overrides = self.evaluate_overrides(clinical_features)
        for o in overrides:
            action = o.get("action", {})
            if action.get("type") == "override":
                for blocked in action.get("block_drugs", []):
                    if blocked in recommendations:
                        recommendations.remove(blocked)
                for forced in action.get("force_recommend", []):
                    if forced not in recommendations:
                        recommendations.append(forced)

        return list(dict.fromkeys(recommendations))

    def evaluate_triggered_rules(self, clinical_features: dict[str, Any]) -> list[dict[str, Any]]:
        """
        Evaluate and return all rules and overrides that are triggered by the clinical features.
        """
        if not self.rules:
            self.load_rules()

        triggered = []
        # 1. Recommendation rules
        for rule in self.rules:
            if "condition" in rule and "outcomes" in rule:
                if self._evaluate_condition(rule["condition"], clinical_features):
                    triggered.append(rule)

        # 2. Override rules
        overrides = self.evaluate_overrides(clinical_features)
        for o in overrides:
            triggered.append(o)

        return triggered



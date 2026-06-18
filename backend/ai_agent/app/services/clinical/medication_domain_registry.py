import logging
import os
import yaml
from dataclasses import dataclass, field
from typing import Any

from app.services.clinical.rule_engine import RuleEngine
from app.services.clinical.retriever import RuleBasedRetriever, GuidelineRetriever

logger = logging.getLogger(__name__)


@dataclass
class MedicationDomain:
    domain_id: str
    name: str
    keywords: list[str] = field(default_factory=list)
    fallback_drugs: list[str] = field(default_factory=list)
    emergency_warning: str | None = None
    clinician_review_checklist: list[str] = field(default_factory=list)
    required_inputs: list[str] = field(default_factory=list)
    rule_engine: RuleEngine = None
    guideline_retriever: GuidelineRetriever = None


class MedicationDomainRegistry:
    def __init__(self, rules_dir: str) -> None:
        self.rules_dir = rules_dir
        self.domains: dict[str, MedicationDomain] = {}

    def discover_domains(self) -> None:
        """
        Scan all subdirectories in rules_dir for domain.yaml/domain.yml files,
        validate metadata, and load the rule engines/retrievers.
        """
        self.domains.clear()
        if not os.path.isdir(self.rules_dir):
            logger.warning("rules_dir is not a valid directory: %s", self.rules_dir)
            return

        for entry in os.scandir(self.rules_dir):
            if entry.is_dir():
                yaml_path = os.path.join(entry.path, "domain.yaml")
                if not os.path.isfile(yaml_path):
                    yaml_path = os.path.join(entry.path, "domain.yml")

                if os.path.isfile(yaml_path):
                    try:
                        with open(yaml_path, "r", encoding="utf-8") as f:
                            data = yaml.safe_load(f)
                        if not data:
                            logger.warning("Empty domain file at %s", yaml_path)
                            continue

                        domain_id = data.get("domain_id")
                        if not domain_id:
                            logger.warning("Missing domain_id in metadata at %s", yaml_path)
                            continue

                        # Validate basic requirements
                        name = data.get("name", domain_id)
                        keywords = data.get("keywords", [])
                        fallback_drugs = data.get("fallback_drugs", [])
                        emergency_warning = data.get("emergency_warning")
                        clinician_review_checklist = data.get("clinician_review_checklist", [])
                        required_inputs = data.get("required_inputs", [])

                        # Build domain rule engine & retriever
                        rule_engine = RuleEngine(entry.path)
                        rule_engine.load_rules()
                        retriever = RuleBasedRetriever(rule_engine)

                        domain = MedicationDomain(
                            domain_id=domain_id,
                            name=name,
                            keywords=keywords,
                            fallback_drugs=fallback_drugs,
                            emergency_warning=emergency_warning,
                            clinician_review_checklist=clinician_review_checklist,
                            required_inputs=required_inputs,
                            rule_engine=rule_engine,
                            guideline_retriever=retriever,
                        )
                        self.domains[domain_id] = domain
                        logger.info("Discovered and loaded medication domain: %s from %s", domain_id, entry.path)
                    except Exception as exc:
                        logger.error("Failed to load medication domain from %s: %s", yaml_path, exc, exc_info=True)

    def get_domain(self, domain_id: str) -> MedicationDomain | None:
        """
        Retrieve a loaded MedicationDomain by its domain_id.
        """
        return self.domains.get(domain_id)

    def match_domain(self, text: str) -> str | None:
        """
        Match the input text against domain keywords case-insensitively.
        Returns the domain_id if a unique domain matches with the highest positive score.
        If there's a tie or no matching keywords, returns None.
        """
        if not text:
            return None

        normalized = text.lower()
        best_matches = []
        best_score = 0

        for domain_id, domain in self.domains.items():
            score = 0
            temp_text = normalized
            # Sort keywords by length descending to match longer phrases first
            sorted_kws = sorted(domain.keywords, key=len, reverse=True)
            for keyword in sorted_kws:
                kw = keyword.lower()
                if kw in temp_text:
                    score += 1
                    # Consume the keyword from temp_text to prevent nested matches
                    temp_text = temp_text.replace(kw, "")
            if score > 0:
                if score > best_score:
                    best_score = score
                    best_matches = [domain_id]
                elif score == best_score:
                    best_matches.append(domain_id)

        if len(best_matches) == 1:
            return best_matches[0]
        return None

    def get_retriever(self, domain_id: str) -> GuidelineRetriever | None:
        """
        Get the guideline retriever for a given domain_id.
        """
        domain = self.get_domain(domain_id)
        return domain.guideline_retriever if domain else None

    def get_rule_engine(self, domain_id: str) -> RuleEngine | None:
        """
        Get the rule engine for a given domain_id.
        """
        domain = self.get_domain(domain_id)
        return domain.rule_engine if domain else None

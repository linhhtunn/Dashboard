from typing import Any
from app.services.clinical.rule_engine import RuleEngine

class DrugSafetyEngine:
    def __init__(self, rule_engine: RuleEngine) -> None:
        self.rule_engine = rule_engine

    def filter_drugs(
        self,
        clinical_features: dict[str, Any],
        recommended_drugs: list[str],
        *,
        fallback_drugs: list[str] | None = None,
        emergency_warning: str | None = None,
    ) -> dict[str, Any]:
        """
        Filter recommended drugs based on safety overrides evaluated by RuleEngine.
        Supports candidate filtering, fallback to Warfarin (VKA), and emergency LAAO warnings.
        Output: Dict with keys: 'allowed_drugs', 'blocked_drugs' (with reasons), and safety alerts.
        """
        # Ensure rules are loaded
        if not self.rule_engine.rules:
            self.rule_engine.load_rules()

        candidates = [d.lower().strip() for d in recommended_drugs]
        
        # Retrieve matched safety override rules from RuleEngine
        overrides = self.rule_engine.evaluate_overrides(clinical_features)
        
        blocked_drugs = {}
        forced_drugs = []
        for o in overrides:
            action = o.get("action", {})
            reason = o.get("reason", "No reason provided.")
            
            # Record blocked drugs
            for drug in action.get("block_drugs", []):
                drug_lower = drug.lower().strip()
                blocked_drugs[drug_lower] = reason
                
            # Record forced drugs
            for drug in action.get("force_recommend", []):
                drug_lower = drug.lower().strip()
                if drug_lower not in forced_drugs:
                    forced_drugs.append(drug_lower)
        
        # Apply filtering (remove blocked candidates)
        allowed_drugs = [d for d in candidates if d not in blocked_drugs]
        
        # Apply forced recommendations (only if not blocked)
        for fd in forced_drugs:
            if fd not in allowed_drugs and fd not in blocked_drugs:
                allowed_drugs.append(fd)
                
        if fallback_drugs is None:
            fallback_drugs = ["warfarin"]

        # Step 3: Optional fallback mechanism if all candidates are blocked
        if not allowed_drugs:
            for fallback in fallback_drugs:
                fallback_lower = fallback.lower().strip()
                if fallback_lower not in blocked_drugs:
                    allowed_drugs.append(fallback_lower)
                
        # Step 4: Emergency policy if all options are blocked
        requires_laao = len(allowed_drugs) == 0
        warning = emergency_warning if requires_laao else None
        if requires_laao and warning is None and fallback_drugs == ["warfarin"]:
            warning = (
                "Cảnh báo nguy hiểm: Không có thuốc kháng đông nào an toàn cho bệnh nhân này. "
                "Khuyến nghị bác sĩ xem xét phương án can thiệp cơ học: Bít tiểu nhĩ (LAAO) theo khuyến cáo ESC 2020."
            )

        return {
            "allowed_drugs": allowed_drugs,
            "blocked_drugs": blocked_drugs,
            "requires_laao": requires_laao,
            "warning": warning,
        }

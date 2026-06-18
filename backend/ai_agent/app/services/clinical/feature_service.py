import os
import glob
import importlib
import logging
from typing import Any

logger = logging.getLogger(__name__)

class FeatureService:
    def __init__(self) -> None:
        self.extractors = {}
        self.ordered_features = []

    def load_plugins(self) -> None:
        """
        Dynamically scan and import derived feature modules from the
        app/features/derived/ directory.
        """
        current_dir = os.path.dirname(os.path.abspath(__file__))
        app_dir = os.path.dirname(os.path.dirname(current_dir))
        derived_path = os.path.join(app_dir, "features", "derived")
        root_dir = os.path.dirname(app_dir)

        pattern = os.path.join(derived_path, "**", "*.py")
        py_files = glob.glob(pattern, recursive=True)

        for filepath in py_files:
            if os.path.basename(filepath) == "__init__.py":
                continue

            try:
                # Convert file path to module path relative to root_dir
                rel_path = os.path.relpath(filepath, start=root_dir)
                module_name = rel_path.replace(os.path.sep, ".").replace(".py", "")

                module = importlib.import_module(module_name)
                
                # Check for required interface functions
                if hasattr(module, "extract") and hasattr(module, "get_required_features"):
                    feature_name = os.path.basename(filepath).replace(".py", "")
                    self.extractors[feature_name] = {
                        "extract": module.extract,
                        "dependencies": module.get_required_features()
                    }
                    logger.info("loaded_clinical_plugin name=%s module=%s", feature_name, module_name)
            except Exception as exc:
                logger.error("failed_to_load_clinical_plugin path=%s reason=%s", filepath, exc, exc_info=True)

        # Build topological sort ordering of features
        self._resolve_topological_order()

    def _resolve_topological_order(self) -> None:
        visited = set()
        visiting = set()
        self.ordered_features = []

        def visit(name: str):
            if name in visiting:
                raise ValueError(f"Circular dependency detected in clinical features: {visiting}")
            if name in visited:
                return
            visiting.add(name)
            
            # Visit derived feature dependencies first
            if name in self.extractors:
                for dep in self.extractors[name]["dependencies"]:
                    if dep in self.extractors:
                        visit(dep)
            
            visiting.remove(name)
            visited.add(name)
            self.ordered_features.append(name)

        for name in self.extractors:
            visit(name)

    def extract_all(self, patient_profile: dict[str, Any]) -> dict[str, Any]:
        """
        Run both base feature extraction and derived feature plugin calculation.
        Input: Raw patient dictionary.
        Output: Dictionary of calculated clinical features.
        """
        if not self.extractors:
            self.load_plugins()

        features = dict(patient_profile)

        # Run extractors in dependency-safe order
        for name in self.ordered_features:
            extractor = self.extractors[name]
            try:
                val = extractor["extract"](features)
                features[name] = val
            except Exception as exc:
                logger.error("error_calculating_derived_feature name=%s reason=%s", name, exc, exc_info=True)
                features[name] = None

        if "crcl" in features:
            features["cr_cl"] = features["crcl"]

        return features


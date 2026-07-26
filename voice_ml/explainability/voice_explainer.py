"""
SHAP-based voice feature explainability.
Explains which prosodic and spectral features contribute to depression risk.
"""

import numpy as np
from typing import Dict, List, Optional
import shap
import os
import json


# Human-readable feature descriptions
FEATURE_DESCRIPTIONS = {
    "pitch_mean": "Average pitch (F0) of voice",
    "pitch_std": "Pitch variability — monotone speech indicates flat affect",
    "pitch_range": "Range of pitch — reduced range linked to depression",
    "pitch_jitter": "Pitch perturbation — irregularity in voice",
    "energy_mean": "Average loudness — low energy linked to depression",
    "energy_std": "Energy variability — flat prosody indicates depression",
    "speech_rate": "Speaking rate — slow speech linked to psychomotor retardation",
    "duration": "Recording length",
    "mfcc_0_mean": "Voice timbre characteristic 0",
    "mfcc_1_mean": "Voice timbre characteristic 1",
    "mfcc_2_mean": "Voice timbre characteristic 2",
    "spectral_centroid_mean": "Spectral brightness — lower in depressed speech",
    "spectral_bandwidth_mean": "Spectral spread",
    "spectral_rolloff_mean": "High frequency content",
    "zcr_mean": "Zero crossing rate — correlates with noisiness",
    "zcr_std": "Zero crossing rate variability",
    "tempo": "Rhythm speed of speech",
    "chroma_0": "Pitch class distribution (C)",
    "chroma_1": "Pitch class distribution (C#)",
    "chroma_2": "Pitch class distribution (D)",
    "chroma_3": "Pitch class distribution (D#)",
    "chroma_4": "Pitch class distribution (E)",
    "chroma_5": "Pitch class distribution (F)",
    "chroma_6": "Pitch class distribution (F#)",
    "chroma_7": "Pitch class distribution (G)",
    "chroma_8": "Pitch class distribution (G#)",
    "chroma_9": "Pitch class distribution (A)",
    "chroma_10": "Pitch class distribution (A#)",
    "chroma_11": "Pitch class distribution (B)",
    "spectral_contrast_0": "Spectral contrast band 1",
    "spectral_contrast_1": "Spectral contrast band 2",
    "spectral_contrast_2": "Spectral contrast band 3",
    "spectral_contrast_3": "Spectral contrast band 4",
    "spectral_contrast_4": "Spectral contrast band 5",
    "spectral_contrast_5": "Spectral contrast band 6",
    "spectral_contrast_6": "Spectral contrast band 7",
    "spectral_flatness_mean": "Spectral flatness — noise vs tone",
}

# Depression-relevant feature indicators
DEPRESSION_INDICATORS = {
    "pitch_std": {"direction": "low", "interpretation": "Monotone speech suggests flat affect"},
    "pitch_range": {"direction": "low", "interpretation": "Reduced pitch range linked to depression"},
    "energy_mean": {"direction": "low", "interpretation": "Low vocal energy indicates fatigue"},
    "energy_std": {"direction": "low", "interpretation": "Flat prosody suggests depression"},
    "speech_rate": {"direction": "low", "interpretation": "Slow speech linked to psychomotor retardation"},
    "spectral_centroid_mean": {"direction": "low", "interpretation": "Duller voice quality"},
    "zcr_mean": {"direction": "low", "interpretation": "Reduced vocal activity"},
}


class VoiceExplainer:
    """
    SHAP-based explainability for voice analysis.
    Explains which prosodic features contribute to depression risk.
    """
    
    def __init__(self):
        self.model = None
        self.explainer = None
        self.feature_names = None
        self._loaded = False
    
    def load(self, model_dir: str = "models") -> bool:
        """Load trained voice model for SHAP explanations."""
        try:
            import joblib
            
            self.model = joblib.load(os.path.join(model_dir, "voice_classifier.pkl"))
            
            with open(os.path.join(model_dir, "model_metadata.json"), "r") as f:
                metadata = json.load(f)
            
            self.feature_names = metadata["feature_names"]
            
            # TreeExplainer for tree-based models
            self.explainer = shap.TreeExplainer(self.model)
            self._loaded = True
            return True
        except Exception as e:
            print(f"Could not load voice model for SHAP: {e}")
            return False
    
    def explain(self, features: Dict[str, float]) -> Dict:
        """
        Generate SHAP explanation for voice features.
        
        Args:
            features: Dict of feature_name -> value from Librosa extraction
        
        Returns:
            - feature_contributions: SHAP values per feature
            - predicted_class: predicted risk level
            - confidence: prediction confidence
            - depression_indicators: features matching depression patterns
        """
        if self._loaded and self.model is not None:
            return self._explain_with_model(features)
        else:
            return self._explain_heuristic(features)
    
    def _explain_with_model(self, features: Dict[str, float]) -> Dict:
        """Use trained model + SHAP for explanation."""
        import joblib
        
        # Build feature vector
        sorted_keys = sorted(self.feature_names)
        vec = np.array([[features.get(k, 0.0) for k in sorted_keys]])
        
        # Scale
        scaler = joblib.load("models/feature_scaler.pkl")
        vec_scaled = scaler.transform(vec)
        
        # SHAP values
        shap_values = self.explainer.shap_values(vec_scaled)
        
        if isinstance(shap_values, list):
            pred = int(self.model.predict(vec_scaled)[0])
            sv = shap_values[pred]
        else:
            sv = shap_values
            pred = int(self.model.predict(vec_scaled)[0])
        
        # Build contributions
        contributions = []
        for i, name in enumerate(sorted_keys):
            val = float(vec[0][i])
            shap_val = float(sv[0][i]) if sv.ndim > 1 else float(sv[i])
            
            description = FEATURE_DESCRIPTIONS.get(name, name)
            indicator = DEPRESSION_INDICATORS.get(name, None)
            
            contributions.append({
                "feature": name,
                "display_name": description,
                "value": val,
                "shap_value": shap_val,
                "contribution": shap_val,
                "is_depression_indicator": indicator is not None,
                "depression_note": indicator["interpretation"] if indicator else None,
            })
        
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        proba = self.model.predict_proba(vec_scaled)[0]
        confidence = float(max(proba))
        risk_levels = ["low", "medium", "high"]
        
        return {
            "predicted_class": pred,
            "risk_level": risk_levels[pred],
            "confidence": confidence,
            "probabilities": {
                risk_levels[i]: float(proba[i]) for i in range(len(proba))
            },
            "feature_contributions": contributions[:20],
        }
    
    def _explain_heuristic(self, features: Dict[str, float]) -> Dict:
        """
        Heuristic explanation when no trained model is available.
        Uses domain knowledge about depression-related voice features.
        """
        contributions = []
        risk_signals = 0
        total_indicators = 0
        
        for name, indicator in DEPRESSION_INDICATORS.items():
            val = features.get(name, 0.0)
            
            # Check if value is "depression-like" (low for these features)
            # Normalize based on typical ranges
            normalized = val / (abs(val) + 1.0)  # Simple normalization
            
            # Depression signal: feature is abnormally low
            depression_signal = max(0, 1 - normalized)
            
            description = FEATURE_DESCRIPTIONS.get(name, name)
            
            contributions.append({
                "feature": name,
                "display_name": description,
                "value": val,
                "shap_value": depression_signal * 0.3,
                "contribution": depression_signal * 0.3,
                "is_depression_indicator": True,
                "depression_note": indicator["interpretation"],
            })
            
            if depression_signal > 0.5:
                risk_signals += 1
            total_indicators += 1
        
        # Add other features with lower weight
        for name, val in features.items():
            if name not in DEPRESSION_INDICATORS:
                description = FEATURE_DESCRIPTIONS.get(name, name)
                contributions.append({
                    "feature": name,
                    "display_name": description,
                    "value": val,
                    "shap_value": 0.0,
                    "contribution": 0.0,
                    "is_depression_indicator": False,
                    "depression_note": None,
                })
        
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        # Risk level
        risk_ratio = risk_signals / (total_indicators + 1)
        if risk_ratio > 0.5:
            risk_level = "high"
            pred_class = 2
        elif risk_ratio > 0.25:
            risk_level = "medium"
            pred_class = 1
        else:
            risk_level = "low"
            pred_class = 0
        
        return {
            "predicted_class": pred_class,
            "risk_level": risk_level,
            "confidence": min(risk_ratio + 0.5, 0.9),
            "probabilities": {
                "low": max(0, 1 - risk_ratio),
                "medium": risk_ratio * 0.5,
                "high": risk_ratio * 0.5,
            },
            "feature_contributions": contributions[:20],
            "method": "heuristic_fallback",
        }


# Singleton
_voice_explainer: Optional[VoiceExplainer] = None


def get_voice_explainer() -> VoiceExplainer:
    global _voice_explainer
    if _voice_explainer is None:
        _voice_explainer = VoiceExplainer()
        _voice_explainer.load()
    return _voice_explainer

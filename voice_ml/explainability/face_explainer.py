"""
SHAP-based face emotion explainability.
Explains which facial action units (AUs) and emotion features
contribute most to the depression risk assessment.
"""

import numpy as np
from typing import Dict, List, Optional
import shap
from sklearn.ensemble import GradientBoostingClassifier
import pickle
import os


# Facial Action Unit (AU) to emotion mapping
# Based on FACS (Facial Action Coding System)
AU_EMOTION_MAP = {
    "AU1": ("Inner Brow Raise", "surprise, sadness"),
    "AU2": ("Outer Brow Raise", "surprise"),
    "AU4": ("Brow Lowerer", "anger, sadness, concentration"),
    "AU5": ("Upper Lid Raise", "fear, surprise"),
    "AU6": ("Cheek Raiser", "happiness, enjoyment"),
    "AU7": ("Lid Tightener", "anger"),
    "AU9": ("Nose Wrinkler", "disgust"),
    "AU10": ("Upper Lip Raiser", "disgust"),
    "AU12": ("Lip Corner Puller", "happiness"),
    "AU15": ("Lip Corner Depressor", "sadness"),
    "AU17": ("Chin Raiser", "sadness, determination"),
    "AU20": ("Lip Stretcher", "fear, sadness"),
    "AU23": ("Lip Tightener", "anger, disgust"),
    "AU24": ("Lip Pressor", "anger, sadness"),
    "AU25": ("Lips Part", "surprise, sadness"),
    "AU26": ("Jaw Drop", "surprise, sadness"),
    "AU28": ("Lip Suck", "anxiety"),
}


# Depression-relevant emotion features
DEPRESSION_FEATURES = {
    "sad": {"weight": 0.9, "affect": "depressive"},
    "angry": {"weight": 0.5, "affect": "irritability"},
    "fearful": {"weight": 0.7, "affect": "anxiety"},
    "disgust": {"weight": 0.4, "affect": "self-disgust"},
    "neutral": {"weight": 0.15, "affect": "flat affect"},
    "calm": {"weight": 0.1, "affect": "normal"},
    "happy": {"weight": 0.05, "affect": "normal"},
    "surprised": {"weight": 0.1, "affect": "normal"},
}


class FaceExplainer:
    """
    SHAP-based explainability for facial emotion analysis.
    Explains which emotion probabilities contribute to depression risk.
    """
    
    def __init__(self):
        self.model = None
        self.explainer = None
        self._loaded = False
    
    def load(self, model_dir: str = "models") -> bool:
        """Load trained face emotion classifier."""
        try:
            with open(os.path.join(model_dir, "face_classifier.pkl"), "rb") as f:
                artifacts = pickle.load(f)
            
            self.model = artifacts["model"]
            
            # Create SHAP explainer
            background = shap.sample(
                artifacts.get("training_data", np.zeros((1, 8))),
                min(50, artifacts.get("training_data", np.zeros((1, 8))).shape[0])
            )
            self.explainer = shap.TreeExplainer(self.model)
            self._loaded = True
            return True
        except Exception as e:
            print(f"Could not load face model: {e}")
            return False
    
    def explain(self, emotions: Dict[str, float]) -> Dict:
        """
        Generate SHAP explanation for facial emotion probabilities.
        
        Args:
            emotions: Dict of emotion -> probability (0-1)
                e.g. {"sad": 0.7, "neutral": 0.2, "happy": 0.1}
        
        Returns:
            - shap_values: per-emotion SHAP values
            - predicted_class: predicted risk level
            - confidence: prediction confidence
            - feature_importance: top contributing features
        """
        # Create feature vector from emotions
        emotion_names = ["sad", "angry", "fearful", "disgust", "neutral",
                        "calm", "happy", "surprised"]
        feature_vec = np.array([[emotions.get(e, 0.0) for e in emotion_names]])
        
        if self._loaded:
            return self._explain_with_model(feature_vec, emotion_names, emotions)
        else:
            return self._explain_heuristic(emotion_names, emotions)
    
    def _explain_with_model(self, feature_vec, emotion_names, emotions) -> Dict:
        """Use trained model + SHAP for explanation."""
        # SHAP values
        shap_values = self.explainer.shap_values(feature_vec)
        
        if isinstance(shap_values, list):
            pred = int(self.model.predict(feature_vec)[0])
            sv = shap_values[pred]
        else:
            sv = shap_values
            pred = int(self.model.predict(feature_vec)[0])
        
        # Build feature contributions
        contributions = []
        for i, name in enumerate(emotion_names):
            val = float(feature_vec[0][i])
            shap_val = float(sv[0][i]) if sv.ndim > 1 else float(sv[i])
            
            meta = DEPRESSION_FEATURES.get(name, {})
            contributions.append({
                "feature": f"emotion_{name}",
                "display_name": name,
                "value": val,
                "shap_value": shap_val,
                "contribution": shap_val,
                "affect": meta.get("affect", ""),
                "depression_weight": meta.get("weight", 0),
            })
        
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        proba = self.model.predict_proba(feature_vec)[0]
        confidence = float(max(proba))
        
        risk_levels = ["low", "medium", "high"]
        
        return {
            "predicted_class": pred,
            "risk_level": risk_levels[pred],
            "confidence": confidence,
            "probabilities": {
                risk_levels[i]: float(proba[i]) for i in range(len(proba))
            },
            "feature_contributions": contributions,
            "emotion_vector": emotions,
        }
    
    def _explain_heuristic(self, emotion_names, emotions) -> Dict:
        """
        Heuristic explanation when no trained model is available.
        Uses depression weight mapping to compute contributions.
        """
        contributions = []
        total_risk = 0.0
        
        for name in emotion_names:
            val = emotions.get(name, 0.0)
            meta = DEPRESSION_FEATURES.get(name, {})
            weight = meta.get("weight", 0.5)
            
            # SHAP-like contribution: how much this emotion pushes risk
            contribution = val * weight
            total_risk += contribution
            
            contributions.append({
                "feature": f"emotion_{name}",
                "display_name": name,
                "value": val,
                "shap_value": contribution,
                "contribution": contribution,
                "affect": meta.get("affect", ""),
                "depression_weight": weight,
            })
        
        contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        # Risk classification
        if total_risk > 0.5:
            risk_level = "high"
            pred_class = 2
        elif total_risk > 0.25:
            risk_level = "medium"
            pred_class = 1
        else:
            risk_level = "low"
            pred_class = 0
        
        # Compute probabilities
        low_prob = max(0, 1 - total_risk)
        high_prob = total_risk * 0.6
        medium_prob = total_risk * 0.4
        
        return {
            "predicted_class": pred_class,
            "risk_level": risk_level,
            "confidence": min(total_risk + 0.5, 0.95),
            "probabilities": {
                "low": low_prob,
                "medium": medium_prob,
                "high": high_prob,
            },
            "feature_contributions": contributions,
            "emotion_vector": emotions,
            "method": "heuristic_fallback",
        }


# Singleton
_face_explainer: Optional[FaceExplainer] = None


def get_face_explainer() -> FaceExplainer:
    global _face_explainer
    if _face_explainer is None:
        _face_explainer = FaceExplainer()
        _face_explainer.load()
    return _face_explainer

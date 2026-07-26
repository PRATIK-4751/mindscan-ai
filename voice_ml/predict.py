"""
Inference module for voice emotion classification.
Loads trained model and predicts depression risk from audio features.
"""

import os
import json
import numpy as np
import joblib
from typing import Dict, Optional, Tuple

from feature_extraction import extract_features, features_to_vector, get_feature_names


class VoiceEmotionClassifier:
    """Load and run inference with trained voice emotion model."""
    
    def __init__(self, model_dir: str = "models"):
        self.model = None
        self.scaler = None
        self.encoder = None
        self.feature_names = None
        self.metadata = None
        self.model_dir = model_dir
        self._loaded = False
    
    def load(self) -> bool:
        """Load model artifacts from disk."""
        try:
            self.model = joblib.load(os.path.join(self.model_dir, "voice_classifier.pkl"))
            self.scaler = joblib.load(os.path.join(self.model_dir, "feature_scaler.pkl"))
            self.encoder = joblib.load(os.path.join(self.model_dir, "label_encoder.pkl"))
            
            with open(os.path.join(self.model_dir, "model_metadata.json"), "r") as f:
                self.metadata = json.load(f)
            
            self.feature_names = self.metadata["feature_names"]
            self._loaded = True
            print(f"Voice model loaded: {len(self.feature_names)} features, "
                  f"{len(self.encoder.classes_)} classes")
            return True
        except Exception as e:
            print(f"Error loading voice model: {e}")
            return False
    
    @property
    def is_loaded(self) -> bool:
        return self._loaded
    
    def predict(self, audio_path: str) -> Dict:
        """
        Predict emotion from audio file.
        Returns dict with predicted_emotion, confidence, all_probabilities,
        and depression_risk_score.
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")
        
        # Extract features
        features = extract_features(audio_path)
        vec = features_to_vector(features)
        
        # Reshape and scale
        X = vec.reshape(1, -1)
        X_scaled = self.scaler.transform(X)
        
        # Predict
        pred_idx = self.model.predict(X_scaled)[0]
        pred_proba = self.model.predict_proba(X_scaled)[0]
        
        predicted_emotion = self.encoder.inverse_transform([pred_idx])[0]
        confidence = float(pred_proba[pred_idx])
        
        # All class probabilities
        all_probs = {}
        for i, cls in enumerate(self.encoder.classes_):
            all_probs[cls] = float(pred_proba[i])
        
        # Depression risk score (0-1)
        # Higher risk for: sad, fearful, angry, disgust
        # Lower risk for: happy, neutral, calm, surprised
        depression_weights = {
            "sad": 0.9,
            "fearful": 0.8,
            "angry": 0.6,
            "disgust": 0.5,
            "neutral": 0.2,
            "calm": 0.1,
            "happy": 0.05,
            "surprised": 0.15,
        }
        
        depression_risk = sum(
            all_probs.get(emotion, 0) * weight
            for emotion, weight in depression_weights.items()
        )
        
        # Feature contributions for explainability
        feature_contributions = self._get_feature_contributions(features)
        
        return {
            "predicted_emotion": predicted_emotion,
            "confidence": confidence,
            "probabilities": all_probs,
            "depression_risk_score": float(depression_risk),
            "feature_contributions": feature_contributions,
            "raw_features": features,
        }
    
    def _get_feature_contributions(self, features: Dict[str, float]) -> list:
        """
        Calculate feature contributions for explainability.
        Uses feature importance from the Random Forest.
        """
        if not self.model or not hasattr(self.model, "feature_importances_"):
            return []
        
        importances = self.model.feature_importances_
        
        contributions = []
        for i, name in enumerate(self.feature_names):
            if i < len(importances):
                contributions.append({
                    "feature": name,
                    "value": features.get(name, 0.0),
                    "importance": float(importances[i]),
                    "contribution": float(features.get(name, 0.0) * importances[i]),
                })
        
        # Sort by absolute contribution
        contributions.sort(key=lambda x: abs(x["contribution"]), reverse=True)
        
        return contributions[:15]  # Top 15


# Singleton instance
_classifier: Optional[VoiceEmotionClassifier] = None


def get_classifier() -> VoiceEmotionClassifier:
    """Get or create the singleton classifier."""
    global _classifier
    if _classifier is None:
        _classifier = VoiceEmotionClassifier()
        _classifier.load()
    return _classifier


def predict_from_audio(audio_path: str) -> Dict:
    """Convenience function to predict from audio path."""
    return get_classifier().predict(audio_path)

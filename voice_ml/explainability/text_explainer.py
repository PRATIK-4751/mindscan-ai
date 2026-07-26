"""
SHAP-based text explainability for depression screening.
Uses TF-IDF + trained classifier with SHAP KernelExplainer.
"""

import re
import numpy as np
from typing import Dict, List, Tuple, Optional
import shap
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
import pickle
import os


# Depression-indicative word categories for feature engineering
DEPRESSION_LEXICON = {
    "sadness": ["sad", "depressed", "hopeless", "empty", "worthless", "crying",
                "tears", "miserable", "grief", "sorrow", "lonely", "alone",
                "isolated", "numb", "hollow", "dark", "gloomy", "down"],
    "anxiety": ["anxious", "worried", "nervous", "panic", "fear", "terrified",
                "stressed", "overwhelmed", "restless", "uneasy", "dread",
                "tension", "worry", "scared", "apprehensive"],
    "fatigue": ["tired", "exhausted", "drained", "fatigue", "sleepy", "weak",
                "sluggish", "no energy", "can't move", "heavy", "lethargic"],
    "cognitive": ["can't think", "confused", "forgetful", "brain fog",
                  "concentration", "focus", "decision", "can't decide",
                  "mind blank", "distracted"],
    "social": ["friends", "family", "relationship", "trust", "abandoned",
               "rejected", "alone", "no one", "nobody", "nobody cares"],
    "physical": ["headache", "stomach", "pain", "appetite", "sleep",
                 "insomnia", "oversleep", "weight", "eating"],
    "hopelessness": ["hopeless", "no point", "give up", "worthless",
                     "meaningless", "future", "no future", "pointless",
                    "why bother", "what's the point"],
    "self_harm": ["hurt myself", "cut", "suicide", "kill", "die",
                  "dead", "end it", "not worth living", "self harm"],
}


def preprocess_text(text: str) -> str:
    """Clean and normalize text for analysis."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text


def extract_lexicon_features(text: str) -> Dict[str, float]:
    """Extract depression lexicon-based features from text."""
    text_lower = text.lower()
    features = {}
    
    for category, words in DEPRESSION_LEXICON.items():
        count = sum(1 for word in words if word in text_lower)
        features[f"lexicon_{category}"] = count / len(words) if words else 0
    
    # Additional heuristic features
    features["text_length"] = len(text.split())
    features["exclamation_count"] = text.count("!")
    features["question_count"] = text.count("?")
    features["uppercase_ratio"] = sum(1 for c in text if c.isupper()) / (len(text) + 1)
    
    return features


def train_text_classifier(texts: List[str], labels: List[int]) -> dict:
    """
    Train TF-IDF + Gradient Boosting classifier for text depression screening.
    
    Args:
        texts: List of text inputs
        labels: 0 = low risk, 1 = medium risk, 2 = high risk
    
    Returns:
        dict with model, vectorizer, shap_explainer, metrics
    """
    # Preprocess
    processed = [preprocess_text(t) for t in texts]
    
    # TF-IDF vectorization
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 3),
        min_df=2,
        max_df=0.95,
        sublinear_tf=True,
    )
    X_tfidf = vectorizer.fit_transform(processed)
    
    # Add lexicon features
    lexicon_features = np.array([
        list(extract_lexicon_features(t).values()) for t in processed
    ])
    
    # Combine TF-IDF + lexicon features
    X_combined = np.hstack([X_tfidf.toarray(), lexicon_features])
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_combined, labels, test_size=0.2, random_state=42, stratify=labels
    )
    
    # Train Gradient Boosting
    model = GradientBoostingClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.1,
        random_state=42,
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    train_acc = model.score(X_train, y_train)
    test_acc = model.score(X_test, y_test)
    
    # Create SHAP explainer
    # Use a sample of training data as background
    background_sample = shap.sample(X_train, min(100, X_train.shape[0]))
    explainer = shap.KernelExplainer(model.predict_proba, background_sample)
    
    return {
        "model": model,
        "vectorizer": vectorizer,
        "explainer": explainer,
        "lexicon_feature_names": list(extract_lexicon_features("").keys()),
        "metrics": {
            "train_accuracy": float(train_acc),
            "test_accuracy": float(test_acc),
        },
    }


class TextExplainer:
    """SHAP-based text explainability for depression screening."""
    
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.explainer = None
        self.lexicon_feature_names = None
        self._loaded = False
    
    def load(self, model_dir: str = "models") -> bool:
        """Load trained text classifier and SHAP explainer."""
        try:
            with open(os.path.join(model_dir, "text_classifier.pkl"), "rb") as f:
                artifacts = pickle.load(f)
            
            self.model = artifacts["model"]
            self.vectorizer = artifacts["vectorizer"]
            self.explainer = artifacts["explainer"]
            self.lexicon_feature_names = artifacts["lexicon_feature_names"]
            self._loaded = True
            return True
        except Exception as e:
            print(f"Could not load text model: {e}")
            return False
    
    def explain(self, text: str) -> Dict:
        """
        Generate SHAP explanation for a text input.
        
        Returns:
            - shap_values: per-word SHAP values
            - predicted_class: predicted risk level
            - confidence: prediction confidence
            - feature_importance: top contributing features
        """
        if not self._loaded:
            # Fallback: use lexicon-based analysis without trained model
            return self._lexicon_explain(text)
        
        processed = preprocess_text(text)
        
        # Vectorize
        X_tfidf = self.vectorizer.transform([processed])
        lexicon_feats = np.array([list(extract_lexicon_features(processed).values())])
        X_combined = np.hstack([X_tfidf.toarray(), lexicon_feats])
        
        # Get feature names
        tfidf_names = self.vectorizer.get_feature_names_out().tolist()
        all_names = tfidf_names + self.lexicon_feature_names
        
        # SHAP explanation
        shap_values = self.explainer.shap_values(X_combined)
        
        # For multi-class, shap_values is list of arrays
        if isinstance(shap_values, list):
            # Take the class with highest probability
            pred = self.model.predict(X_combined)[0]
            sv = shap_values[pred]
        else:
            sv = shap_values
            pred = self.model.predict(X_combined)[0]
        
        # Get top contributing features
        feature_contributions = []
        for i, name in enumerate(all_names):
            val = float(X_combined[0][i])
            shap_val = float(sv[0][i]) if sv.ndim > 1 else float(sv[i])
            
            if abs(shap_val) > 0.001 or abs(val) > 0:  # Filter noise
                feature_contributions.append({
                    "feature": name,
                    "value": val,
                    "shap_value": shap_val,
                    "contribution": shap_val,
                })
        
        # Sort by absolute SHAP value
        feature_contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        # Confidence
        proba = self.model.predict_proba(X_combined)[0]
        confidence = float(max(proba))
        
        # Risk level mapping
        risk_levels = ["low", "medium", "high"]
        
        return {
            "predicted_class": int(pred),
            "risk_level": risk_levels[pred],
            "confidence": confidence,
            "probabilities": {
                risk_levels[i]: float(proba[i]) for i in range(len(proba))
            },
            "feature_contributions": feature_contributions[:20],  # Top 20
            "text_features": extract_lexicon_features(processed),
        }
    
    def _lexicon_explain(self, text: str) -> Dict:
        """
        Fallback lexicon-based explanation when no trained model is available.
        Uses the depression lexicon to compute risk scores and word-level contributions.
        """
        processed = preprocess_text(text)
        text_lower = processed.lower()
        words = text_lower.split()
        
        lexicon_feats = extract_lexicon_features(processed)
        
        # Simple risk score from lexicon
        total_score = sum(lexicon_feats.values())
        max_possible = len(DEPRESSION_LEXICON)  # number of categories
        
        risk_score = min(total_score / (max_possible * 0.3), 1.0)
        
        # Word-level contributions
        word_contributions = []
        depression_words = set()
        for category, cat_words in DEPRESSION_LEXICON.items():
            for word in cat_words:
                depression_words.add(word)
        
        for word in words:
            if word in depression_words:
                # Find which category it belongs to
                for category, cat_words in DEPRESSION_LEXICON.items():
                    if word in cat_words:
                        # Higher contribution for sadness/hopelessness/self_harm
                        weight = {
                            "sadness": 0.8,
                            "anxiety": 0.7,
                            "fatigue": 0.5,
                            "cognitive": 0.6,
                            "social": 0.4,
                            "physical": 0.3,
                            "hopelessness": 0.9,
                            "self_harm": 1.0,
                        }.get(category, 0.5)
                        
                        word_contributions.append({
                            "feature": word,
                            "value": 1.0,
                            "shap_value": weight * 0.3,
                            "contribution": weight * 0.3,
                            "category": category,
                        })
                        break
        
        word_contributions.sort(key=lambda x: abs(x["shap_value"]), reverse=True)
        
        # Risk level
        if risk_score > 0.6:
            risk_level = "high"
            pred_class = 2
        elif risk_score > 0.3:
            risk_level = "medium"
            pred_class = 1
        else:
            risk_level = "low"
            pred_class = 0
        
        return {
            "predicted_class": pred_class,
            "risk_level": risk_level,
            "confidence": min(risk_score + 0.5, 0.95),
            "probabilities": {
                "low": max(0, 1 - risk_score),
                "medium": risk_score * 0.5,
                "high": risk_score * 0.5,
            },
            "feature_contributions": word_contributions[:20],
            "text_features": lexicon_feats,
            "method": "lexicon_fallback",
        }


# Singleton
_text_explainer: Optional[TextExplainer] = None


def get_text_explainer() -> TextExplainer:
    global _text_explainer
    if _text_explainer is None:
        _text_explainer = TextExplainer()
        _text_explainer.load()
    return _text_explainer

"""
FastAPI server for MindScan ML analysis.
Voice emotion analysis + SHAP explainability for text, face, and voice.
"""

import os
import tempfile
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, List, Optional

from predict import get_classifier

app = FastAPI(
    title="MindScan ML Service",
    description="Voice emotion analysis + SHAP explainability for depression screening",
    version="2.0.0",
)

# CORS for Next.js dev server + production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models ---

class TextExplainRequest(BaseModel):
    text: str

class FaceExplainRequest(BaseModel):
    emotions: Dict[str, float]

class CombinedExplainRequest(BaseModel):
    text: Optional[str] = None
    face_emotions: Optional[Dict[str, float]] = None
    voice_features: Optional[Dict[str, float]] = None


@app.on_event("startup")
async def startup_event():
    """Load models on startup."""
    # Load voice classifier
    classifier = get_classifier()
    if classifier.is_loaded:
        print("Voice ML model loaded successfully")
    else:
        print("Voice ML model not found. Run train_model.py first.")

    # Load explainers (they fall back to heuristic if no trained model)
    try:
        from explainability.text_explainer import get_text_explainer
        get_text_explainer()
        print("Text explainer loaded")
    except Exception as e:
        print(f"Text explainer fallback: {e}")

    try:
        from explainability.face_explainer import get_face_explainer
        get_face_explainer()
        print("Face explainer loaded")
    except Exception as e:
        print(f"Face explainer fallback: {e}")

    try:
        from explainability.voice_explainer import get_voice_explainer
        get_voice_explainer()
        print("Voice explainer loaded")
    except Exception as e:
        print(f"Voice explainer fallback: {e}")


# --- Health ---

@app.get("/health")
async def health():
    """Health check endpoint."""
    classifier = get_classifier()
    return {
        "status": "ok",
        "service": "mindscan-ml",
        "voice_model_loaded": classifier.is_loaded,
        "features": ["voice_analysis", "text_explain", "face_explain", "voice_explain"],
    }


# --- Voice Analysis (original) ---

@app.post("/analyze")
async def analyze_voice(audio: UploadFile = File(...)):
    """
    Analyze voice recording for emotion and depression risk.
    Accepts: audio/webm, audio/wav, audio/mp3
    """
    classifier = get_classifier()

    if not classifier.is_loaded:
        raise HTTPException(
            status_code=503,
            detail="Voice ML model not loaded. Run train_model.py first.",
        )

    allowed_types = ["audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg"]
    if audio.content_type and audio.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio type: {audio.content_type}. "
                   f"Supported: {', '.join(allowed_types)}",
        )

    suffix = ".webm"
    if audio.content_type == "audio/wav":
        suffix = ".wav"
    elif audio.content_type in ["audio/mp3", "audio/mpeg"]:
        suffix = ".mp3"

    tmp_path = os.path.join(tempfile.gettempdir(), f"voice_{uuid.uuid4().hex}{suffix}")

    try:
        content = await audio.read()
        with open(tmp_path, "wb") as f:
            f.write(content)

        result = classifier.predict(tmp_path)

        return {
            "emotion": result["predicted_emotion"],
            "confidence": result["confidence"],
            "probabilities": result["probabilities"],
            "depression_risk_score": result["depression_risk_score"],
            "feature_contributions": result["feature_contributions"],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


# --- Text SHAP Explainability ---

@app.post("/explain/text")
async def explain_text(req: TextExplainRequest):
    """
    SHAP-based explainability for text depression screening.
    Returns per-word contributions, predicted risk, and confidence.
    """
    from explainability.text_explainer import get_text_explainer

    if not req.text or len(req.text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Text too short for analysis")

    explainer = get_text_explainer()
    result = explainer.explain(req.text)

    return {
        "shap_values": result["feature_contributions"],
        "predicted_class": result["predicted_class"],
        "risk_level": result["risk_level"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
        "text_features": result.get("text_features", {}),
        "method": result.get("method", "shap_trained"),
    }


# --- Face SHAP Explainability ---

@app.post("/explain/face")
async def explain_face(req: FaceExplainRequest):
    """
    SHAP-based explainability for facial emotion analysis.
    Returns per-emotion SHAP contributions and depression risk.
    """
    from explainability.face_explainer import get_face_explainer

    if not req.emotions:
        raise HTTPException(status_code=400, detail="No emotions provided")

    explainer = get_face_explainer()
    result = explainer.explain(req.emotions)

    return {
        "shap_values": result["feature_contributions"],
        "predicted_class": result["predicted_class"],
        "risk_level": result["risk_level"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
        "emotion_vector": result.get("emotion_vector", {}),
        "method": result.get("method", "shap_trained"),
    }


# --- Voice SHAP Explainability ---

@app.post("/explain/voice")
async def explain_voice_features(req: FaceExplainRequest):
    """
    SHAP-based explainability for voice feature analysis.
    Accepts extracted Librosa features, returns per-feature contributions.
    """
    from explainability.voice_explainer import get_voice_explainer

    if not req.emotions:
        raise HTTPException(status_code=400, detail="No voice features provided")

    explainer = get_voice_explainer()
    result = explainer.explain(req.emotions)

    return {
        "shap_values": result["feature_contributions"],
        "predicted_class": result["predicted_class"],
        "risk_level": result["risk_level"],
        "confidence": result["confidence"],
        "probabilities": result["probabilities"],
        "method": result.get("method", "shap_trained"),
    }


# --- Combined Explainability ---

@app.post("/explain/combined")
async def explain_combined(req: CombinedExplainRequest):
    """
    Combined SHAP explanation across all modalities.
    Aggregates text, face, and voice explanations into a unified view.
    """
    results = {}

    if req.text and len(req.text.strip()) >= 5:
        from explainability.text_explainer import get_text_explainer
        explainer = get_text_explainer()
        results["text"] = explainer.explain(req.text)

    if req.face_emotions:
        from explainability.face_explainer import get_face_explainer
        explainer = get_face_explainer()
        results["face"] = explainer.explain(req.face_emotions)

    if req.voice_features:
        from explainability.voice_explainer import get_voice_explainer
        explainer = get_voice_explainer()
        results["voice"] = explainer.explain(req.voice_features)

    if not results:
        raise HTTPException(status_code=400, detail="No input provided for explanation")

    # Aggregate risk
    risk_scores = []
    for modality, r in results.items():
        risk_scores.append(r["probabilities"].get("high", 0))

    combined_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0

    if combined_risk > 0.5:
        risk_level = "high"
    elif combined_risk > 0.25:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "modalities": {
            name: {
                "shap_values": r["feature_contributions"][:10],
                "risk_level": r["risk_level"],
                "confidence": r["confidence"],
                "method": r.get("method", "shap"),
            }
            for name, r in results.items()
        },
        "combined_risk": combined_risk,
        "risk_level": risk_level,
        "num_modalities": len(results),
    }


# --- Model Info ---

@app.get("/model/info")
async def model_info():
    """Return model metadata."""
    classifier = get_classifier()

    if not classifier.is_loaded:
        return {
            "voice_model": "not_loaded",
            "explainability": ["text_heuristic", "face_heuristic", "voice_heuristic"],
        }

    return {
        "voice_model": {
            "num_features": len(classifier.feature_names),
            "classes": list(classifier.encoder.classes_),
            "metrics": classifier.metadata.get("metrics", {}),
        },
        "explainability": {
            "text": "shap_kernel" if os.path.exists("models/text_classifier.pkl") else "lexicon_fallback",
            "face": "shap_tree" if os.path.exists("models/face_classifier.pkl") else "heuristic_fallback",
            "voice": "shap_tree" if os.path.exists("models/voice_classifier.pkl") else "heuristic_fallback",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

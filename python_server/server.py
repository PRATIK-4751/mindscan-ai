"""
MindScan AI — Python Backend (FastAPI)
Replaces Next.js API routes with Python-based face detection + LLM routing.
"""

import os
import sys
import json
import time
import base64
import re
from contextlib import asynccontextmanager
from io import BytesIO
from typing import Optional

import cv2
import numpy as np
import httpx
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ─── Constants ────────────────────────────────────────────────────────────────
EMOTIONS = ["Angry", "Disgust", "Fear", "Happy", "Neutral", "Sad", "Surprise"]
FACE_DETECTOR_PROTO = os.path.join(os.path.dirname(__file__), "deploy.prototxt")
FACE_DETECTOR_MODEL = os.path.join(os.path.dirname(__file__), "res10_300x300_ssd_iter_140000_fp16.caffemodel")
EMOTION_MODEL_PATH = os.path.join(os.path.dirname(__file__), "emotion_model.h5")

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "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")
NVIDIA_API_URL = os.getenv("NVIDIA_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyAC8Z-8xacd8o6vYocQCMl12HbyUlvAc8U")

# ─── Model Registry ───────────────────────────────────────────────────────────
MODEL_REGISTRY = {
    "chat": {
        "primary": "meta/llama-4-maverick-17b-128e-instruct",
        "fallbacks": ["meta/llama-3.3-70b-instruct", "deepseek-ai/deepseek-v4-flash", "mistralai/mistral-large-2-instruct"],
    },
    "text": {
        "primary": "meta/llama-3.3-70b-instruct",
        "fallbacks": ["deepseek-ai/deepseek-v4-flash", "meta/llama-3.1-70b-instruct", "nvidia/llama-3.1-nemotron-70b-instruct"],
    },
    "voice": {
        "primary": "meta/llama-3.2-3b-instruct",
        "fallbacks": ["google/gemma-3-4b-it", "meta/llama-3.1-8b-instruct", "deepseek-ai/deepseek-v4-flash"],
    },
}

# ─── Globals ──────────────────────────────────────────────────────────────────
emotion_model = None
face_net = None
_http_client: Optional[httpx.AsyncClient] = None
_startup_time = time.time()


# ─── Model Loading ────────────────────────────────────────────────────────────
def download_file(url: str, dest: str):
    print(f"Downloading {os.path.basename(dest)}...")
    import urllib.request
    urllib.request.urlretrieve(url, dest)
    print(f"Downloaded {os.path.basename(dest)}")


def load_face_detector():
    if not os.path.exists(FACE_DETECTOR_PROTO):
        download_file(
            "https://github.com/opencv/opencv/raw/master/samples/dnn/face_detector/deploy.prototxt",
            FACE_DETECTOR_PROTO,
        )
    if not os.path.exists(FACE_DETECTOR_MODEL):
        download_file(
            "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20180205_fp16/res10_300x300_ssd_iter_140000_fp16.caffemodel",
            FACE_DETECTOR_MODEL,
        )
    return cv2.dnn.readNetFromCaffe(FACE_DETECTOR_PROTO, FACE_DETECTOR_MODEL)


def detect_faces(frame, net, confidence_threshold=0.5):
    h, w = frame.shape[:2]
    blob = cv2.dnn.blobFromImage(cv2.resize(frame, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
    net.setInput(blob)
    detections = net.forward()
    faces = []
    for i in range(detections.shape[2]):
        confidence = detections[0, 0, i, 2]
        if confidence > confidence_threshold:
            box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
            x1, y1, x2, y2 = box.astype("int")
            fx, fy = max(0, x1), max(0, y1)
            fw, fh = min(x2 - fx, frame.shape[1] - fx), min(y2 - fy, frame.shape[0] - fy)
            if fw > 20 and fh > 20:
                faces.append([fx, fy, fw, fh, float(confidence)])
    return faces


def preprocess_face(gray, face_box):
    x, y, w, h = face_box[:4]
    roi = gray[y: y + h, x: x + w]
    if roi.size == 0 or w == 0 or h == 0:
        return None
    roi = cv2.resize(roi, (48, 48), interpolation=cv2.INTER_AREA)
    roi = roi.astype("float32") / 255.0
    return np.expand_dims(np.expand_dims(roi, axis=-1), axis=0)


# ─── Lifespan (replaces deprecated on_event) ─────────────────────────────────
@asynccontextmanager
async def lifespan(app):
    global emotion_model, face_net, _http_client
    _http_client = httpx.AsyncClient(timeout=30.0)

    # Load emotion model (from repo or local)
    try:
        from tensorflow.keras.models import load_model
        if os.path.exists(EMOTION_MODEL_PATH):
            print("Loading emotion model...")
            emotion_model = load_model(EMOTION_MODEL_PATH)
            print("Emotion model loaded.")
        else:
            print(f"WARNING: {EMOTION_MODEL_PATH} not found. Emotion detection disabled.")
    except Exception as e:
        print(f"WARNING: Could not load emotion model: {e}")

    # Load face detector (downloads if missing)
    try:
        print("Loading DNN face detector...")
        face_net = load_face_detector()
        print("Face detector loaded.")
    except Exception as e:
        print(f"WARNING: Could not load face detector: {e}")

    yield

    # Shutdown
    if _http_client:
        await _http_client.aclose()


# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="MindScan AI Backend", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── LLM Caller ───────────────────────────────────────────────────────────────
async def call_nvidia_api(model: str, messages: list, temperature: float = 0.7, max_tokens: int = 1024, timeout_s: float = 25.0) -> str:
    if not NVIDIA_API_KEY:
        raise HTTPException(status_code=503, detail="NVIDIA API key not configured")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
    }
    body = {
        "model": model,
        "stream": False,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    resp = await _http_client.post(NVIDIA_API_URL, json=body, headers=headers, timeout=timeout_s)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"NVIDIA API error ({resp.status_code}) for {model}")
    data = resp.json()
    content = (data.get("choices", [{}])[0].get("message", {}).get("content")
               or data.get("message", {}).get("content")
               or data.get("response", ""))
    if not content:
        raise HTTPException(status_code=502, detail="Empty response from NVIDIA API")
    return content


async def call_llm(feature: str, messages: list, temperature: float = 0.7, max_tokens: int = 1024) -> str:
    reg = MODEL_REGISTRY.get(feature, MODEL_REGISTRY["chat"])
    all_models = [reg["primary"]] + reg["fallbacks"]
    last_error = None
    for model in all_models:
        try:
            result = await call_nvidia_api(model, messages, temperature, max_tokens)
            print(f"LLM success [{feature}] -> {model}")
            return result
        except Exception as e:
            print(f"LLM failed [{feature}] -> {model}: {e}")
            last_error = e
            continue
    raise last_error or HTTPException(status_code=503, detail=f"All models failed for {feature}")


# ─── Google Vision ────────────────────────────────────────────────────────────
async def call_google_vision(base64_image: str) -> dict:
    if not GOOGLE_API_KEY:
        return {}
    try:
        async with _http_client as client:
            resp = await client.post(
                f"https://vision.googleapis.com/v1/images:annotate?key={GOOGLE_API_KEY}",
                json={
                    "requests": [{
                        "image": {"content": base64_image},
                        "features": [
                            {"type": "FACE_DETECTION", "maxResults": 1},
                            {"type": "LABEL_DETECTION", "maxResults": 5},
                        ],
                    }]
                },
                timeout=10.0,
            )
            data = resp.json()
            return data.get("responses", [{}])[0] or {}
    except Exception as e:
        print(f"Google Vision error: {e}")
        return {}


def likelihood_score(val: str) -> float:
    return {"VERY_LIKELY": 1.0, "LIKELY": 0.8, "POSSIBLE": 0.5, "UNLIKELY": 0.2}.get(val, 0.0)


def extract_json(text: str) -> str:
    """Extract JSON from text — handle code fences or bare JSON."""
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        return fence.group(1).strip()
    brace = re.search(r"\{[\s\S]*\}", text)
    if brace:
        return brace.group(0).strip()
    return text.strip()


# ─── Health ───────────────────────────────────────────────────────────────────
@app.get("/health")
@app.get("/ping")
async def health():
    return {
        "status": "ok",
        "emotion_model_loaded": emotion_model is not None,
        "face_detector_loaded": face_net is not None,
        "uptime_s": round(time.time() - _startup_time, 1),
    }


# ─── Face / Vision Analysis ──────────────────────────────────────────────────
@app.post("/predict")
@app.post("/vision")
@app.post("/api/vision")
async def predict(
    image: UploadFile = File(...),
    clientEmotions: Optional[str] = Form(None),
):
    if emotion_model is None or face_net is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet.")

    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image data.")

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detect_faces(frame, face_net, confidence_threshold=0.4)

    # Google Vision
    base64_image = base64.b64encode(contents).decode("utf-8")
    google_vision = await call_google_vision(base64_image)
    google_labels = [l.get("description", "") for l in google_vision.get("labelAnnotations", [])[:5]]
    face_annotations = google_vision.get("faceAnnotations", [])
    google_joy = likelihood_score(face_annotations[0].get("joyLikelihood", "UNKNOWN")) if face_annotations else 0
    google_sorrow = likelihood_score(face_annotations[0].get("sorrowLikelihood", "UNKNOWN")) if face_annotations else 0
    google_anger = likelihood_score(face_annotations[0].get("angerLikelihood", "UNKNOWN")) if face_annotations else 0
    google_surprise = likelihood_score(face_annotations[0].get("surpriseLikelihood", "UNKNOWN")) if face_annotations else 0

    # Parse client emotions if provided
    client_emo = None
    if clientEmotions:
        try:
            client_emo = json.loads(clientEmotions)
        except:
            pass

    # Determine face emotion scores
    face_score = 0.2
    detected_face_emotion = "Neutral"
    emotions = {e: 0.0 for e in EMOTIONS}
    dominant_emotion = None
    emotion_confidence = None
    faces_detected = len(faces)

    if client_emo and client_emo.get("face_detected"):
        emotions = client_emo.get("emotions", emotions)
        dominant_emotion = client_emo.get("dominant_emotion")
        emotion_confidence = client_emo.get("confidence")
        faces_detected = max(faces_detected, 1)

        emo = dominant_emotion or "Neutral"
        conf = emotion_confidence or 0

        if emo == "Sad":
            detected_face_emotion = "Sad"
            face_score = 0.7 + conf * 0.2
        elif emo == "Angry":
            detected_face_emotion = "Tense"
            face_score = 0.6 + conf * 0.2
        elif emo == "Fear":
            detected_face_emotion = "Anxious"
            face_score = 0.65 + conf * 0.2
        elif emo == "Disgust":
            detected_face_emotion = "Distressed"
            face_score = 0.55 + conf * 0.2
        elif emo == "Surprise":
            detected_face_emotion = "Surprised"
            face_score = 0.3 + conf * 0.2
        elif emo == "Happy":
            detected_face_emotion = "Calm"
            face_score = 0.1
        else:
            detected_face_emotion = "Neutral"
            face_score = 0.2

        if google_sorrow > 0.4 and detected_face_emotion != "Sad":
            face_score = min(face_score + 0.15, 0.95)
            detected_face_emotion = "Sad"
        if google_anger > 0.4 and detected_face_emotion != "Tense":
            face_score = min(face_score + 0.1, 0.95)
            detected_face_emotion = "Tense"
    elif faces:
        if google_sorrow > 0.4:
            detected_face_emotion = "Sad"
            face_score = 0.8 + google_sorrow * 0.15
        elif google_anger > 0.4:
            detected_face_emotion = "Tense"
            face_score = 0.7 + google_anger * 0.15
        elif google_surprise > 0.4:
            detected_face_emotion = "Anxious"
            face_score = 0.6 + google_surprise * 0.15
        elif google_joy > 0.4:
            detected_face_emotion = "Calm"
            face_score = 0.1

    # Server-side emotion detection if model loaded and no client emotions
    if emotion_model is not None and face_net is not None and not client_emo and faces:
        primary = max(faces, key=lambda f: f[2] * f[3])
        face_input = preprocess_face(gray, primary)
        if face_input is not None:
            probs = emotion_model.predict(face_input, verbose=0)[0]
            best_idx = int(np.argmax(probs))
            emotions = {EMOTIONS[i]: round(float(probs[i]), 4) for i in range(len(EMOTIONS))}
            dominant_emotion = EMOTIONS[best_idx]
            emotion_confidence = round(float(probs[best_idx]), 4)
            emo = dominant_emotion
            if emo == "Sad":
                detected_face_emotion = "Sad"
                face_score = 0.7 + emotion_confidence * 0.2
            elif emo == "Angry":
                detected_face_emotion = "Tense"
                face_score = 0.6 + emotion_confidence * 0.2
            elif emo == "Fear":
                detected_face_emotion = "Anxious"
                face_score = 0.65 + emotion_confidence * 0.2
            elif emo == "Happy":
                detected_face_emotion = "Calm"
                face_score = 0.1
            else:
                detected_face_emotion = "Neutral"
                face_score = 0.2

    face_score = min(max(face_score, 0), 0.95)

    return JSONResponse(content={
        "face_score": round(face_score, 4),
        "detected_face_emotion": detected_face_emotion,
        "faces_detected": faces_detected,
        "emotions": emotions,
        "dominant_emotion": dominant_emotion,
        "emotion_confidence": emotion_confidence,
        "google_labels": google_labels,
    })


# ─── Text Analysis ────────────────────────────────────────────────────────────
@app.post("/text")
@app.post("/api/text")
async def text_analysis(body: dict):
    text = body.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided")

    system_prompt = """You are MindScan, an empathetic mental health screening AI. A user has shared their personal story with you.

YOUR ROLE:
- Listen deeply to what they share
- Respond with warmth, validation, and genuine care
- Provide a compassionate, thoughtful reply (3-5 sentences) acknowledging their experience
- Gently reflect back the key emotions you sense
- If you detect distress, normalize it and offer hope
- If crisis signals appear (self-harm, suicide), immediately provide crisis resources (988 Suicide & Crisis Lifeline)

ALSO return a structured analysis. Your response MUST be valid JSON with this exact structure:

{
  "reply": "Your compassionate response to the user here...",
  "text_score": 0.5,
  "lime_words": [{"word": "word", "score": 0.8}],
  "detected_emotions": ["sadness", "anxiety"],
  "summary": "Brief clinical summary"
}

RULES FOR text_score:
- 0.0-0.2: Minimal distress, casual/neutral
- 0.2-0.4: Mild distress, some emotional weight
- 0.4-0.6: Moderate distress, concerning patterns
- 0.6-0.8: Significant distress, needs attention
- 0.8-1.0: Severe distress, potential crisis

RULES FOR lime_words:
- Extract 3-5 emotionally significant words/phrases from the input
- Score each by emotional intensity (0.0-1.0)

RULES FOR detected_emotions:
- List primary emotions you detect (e.g., sadness, anxiety, anger, hopelessness, isolation, fatigue, fear, numbness, confusion)

CRITICAL:
- Never diagnose or label conditions
- The JSON must be parseable — no markdown, no extra text outside the JSON
- If the user shares something concerning, acknowledge it directly"""

    try:
        content = await call_llm("text", [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": text},
        ], temperature=0.3, max_tokens=800)

        json_str = extract_json(content)
        parsed = json.loads(json_str)
        return JSONResponse(content={
            "reply": parsed.get("reply", "Thank you for sharing. I hear you."),
            "text_score": min(max(parsed.get("text_score", 0), 0), 1),
            "lime_words": [{"word": str(w.get("word", "")), "score": min(max(float(w.get("score", 0)), 0), 1)}
                           for w in (parsed.get("lime_words") or [])[:5]],
            "detected_emotions": parsed.get("detected_emotions", []),
            "summary": parsed.get("summary", ""),
        })
    except json.JSONDecodeError:
        lexicon = _fallback_lexicon(text)
        return JSONResponse(content={
            "reply": content.strip() if 'content' in dir() else "Thank you for sharing.",
            **lexicon,
        })
    except Exception as e:
        print(f"Text analysis error: {e}")
        return JSONResponse(content=_fallback_lexicon(text))


# ─── Voice Analysis ───────────────────────────────────────────────────────────
@app.post("/voice")
@app.post("/api/voice")
async def voice_analysis(
    audio: UploadFile = File(...),
    transcript: Optional[str] = Form(None),
):
    if not audio:
        raise HTTPException(status_code=400, detail="No audio provided")

    if transcript and len(transcript.strip()) > 5:
        try:
            content = await call_llm("voice", [
                {"role": "system", "content": """Analyze this voice transcript for emotional content. Return ONLY valid JSON (no markdown, no code fences):
{"voice_score":0.5,"detected_voice_emotion":"Sadness","emotional_indicators":["tired","isolated"],"severity_notes":"Brief observation"}

voice_score: 0.0-1.0 (0=calm, 1=severe distress). detected_voice_emotion: single word (Sadness/Anxiety/Frustration/Hopelessness/Fear/Numbness/Neutral). emotional_indicators: 2-4 words from the text. severity_notes: one sentence. If crisis language (suicide/self-harm), set score >= 0.8 and emotion to "Crisis"."""},
                {"role": "user", "content": transcript},
            ], temperature=0.3, max_tokens=400)

            json_str = extract_json(content)
            parsed = json.loads(json_str)
            return JSONResponse(content={
                "voice_score": min(max(parsed.get("voice_score", 0.5), 0), 1),
                "detected_voice_emotion": parsed.get("detected_voice_emotion", "Neutral"),
                "transcript": transcript,
                "emotional_indicators": parsed.get("emotional_indicators", []),
                "severity_notes": parsed.get("severity_notes", ""),
            })
        except Exception as e:
            print(f"Voice LLM error: {e}")

    # Fallback
    return JSONResponse(content={
        "voice_score": 0.3,
        "detected_voice_emotion": "Neutral",
        "transcript": transcript or "",
        "emotional_indicators": [],
        "severity_notes": "Analysis based on audio characteristics only.",
    })


# ─── Chat ─────────────────────────────────────────────────────────────────────
@app.post("/chat")
@app.post("/api/chat")
async def chat(body: dict):
    messages = body.get("messages", [])
    system_prompt = body.get("systemPrompt", "")

    all_messages = []
    if system_prompt:
        all_messages.append({"role": "system", "content": system_prompt})
    all_messages.extend([{"role": m.get("role", "user"), "content": m.get("content", "")} for m in messages])

    try:
        reply = await call_llm("chat", all_messages, temperature=0.7, max_tokens=1024)
        return JSONResponse(content={"reply": reply})
    except Exception as e:
        print(f"Chat API error: {e}")
        return JSONResponse(content={
            "error": "AI service unavailable",
            "reply": "I'm experiencing connection issues right now. Please try again in a moment.",
        }, status_code=503)


# ─── PHQ-9 ────────────────────────────────────────────────────────────────────
@app.post("/phq9")
@app.post("/api/phq9")
async def phq9(body: dict):
    answers = body.get("answers", [])
    if not isinstance(answers, list):
        raise HTTPException(status_code=400, detail="Invalid answers")

    total = sum(answers)
    score = total / 27.0

    if total >= 20:
        severity = "Severe"
    elif total >= 15:
        severity = "Moderately Severe"
    elif total >= 10:
        severity = "Moderate"
    elif total >= 5:
        severity = "Mild"
    else:
        severity = "Minimal"

    return JSONResponse(content={"phq9_score": score, "phq9_total": total, "phq9_severity": severity})


# ─── Combined Analysis ────────────────────────────────────────────────────────
@app.post("/combined")
@app.post("/api/combined")
async def combined(body: dict):
    text_score = body.get("text_score", 0)
    face_score = body.get("face_score", 0)
    voice_score = body.get("voice_score", 0)
    phq9_score = body.get("phq9_score", 0)

    final_score = (text_score * 0.3) + (face_score * 0.2) + (voice_score * 0.2) + (phq9_score * 0.3)

    if final_score > 0.7:
        risk_level = "High Risk"
    elif final_score > 0.4:
        risk_level = "Medium Risk"
    else:
        risk_level = "Low Risk"

    internal_distress = (text_score + phq9_score) / 2
    external_distress = (face_score + voice_score) / 2
    silent_distress = False
    if internal_distress > 0.65 and external_distress < 0.35:
        silent_distress = True
        risk_level = "High Risk (Silent Distress)"

    return JSONResponse(content={
        **body,
        "final_score": round(final_score, 4),
        "risk_level": risk_level,
        "silentDistress": silent_distress,
        "detected_face_emotion": "Sad/Tense" if face_score > 0.6 else "Neutral",
        "detected_voice_emotion": "Sad/Tense" if voice_score > 0.6 else "Neutral",
    })


# ─── Fallback Lexicon ─────────────────────────────────────────────────────────
def _fallback_lexicon(text: str) -> dict:
    lower = text.lower()
    sad_words = ["sad", "depressed", "hopeless", "tired", "cry", "alone", "lonely", "dark", "pain", "worthless", "empty", "numb", "lost", "broken", "hurt"]
    anxious_words = ["anxious", "nervous", "scared", "worry", "panic", "fear", "stress", "overwhelmed"]
    crisis_words = ["suicide", "kill", "die", "end it", "hurt myself", "self harm", "no reason to live"]

    score = 0.15
    matches = []
    emotions = []

    for w in crisis_words:
        if w in lower:
            score += 0.35
            matches.append({"word": w, "score": 0.9})
            if "crisis" not in emotions:
                emotions.append("crisis")
    for w in sad_words:
        if w in lower:
            score += 0.12
            matches.append({"word": w, "score": 0.6})
            if "sadness" not in emotions:
                emotions.append("sadness")
    for w in anxious_words:
        if w in lower:
            score += 0.1
            matches.append({"word": w, "score": 0.5})
            if "anxiety" not in emotions:
                emotions.append("anxiety")

    score = min(score, 0.95)
    if not emotions:
        emotions.append("neutral")

    return {
        "text_score": score,
        "lime_words": matches[:5],
        "detected_emotions": emotions,
        "summary": f"Detected {', '.join(emotions)} with {int(score * 100)}% distress level.",
    }


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)

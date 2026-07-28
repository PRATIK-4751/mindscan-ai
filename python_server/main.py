import os
import json
import threading
import time
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_API_URL = os.getenv("NVIDIA_API_URL", "https://integrate.api.nvidia.com/v1/chat/completions")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "")

def keep_alive():
    while True:
        try:
            time.sleep(14 * 60)
            url = os.getenv("RENDER_EXTERNAL_URL")
            if url:
                httpx.get(f"{url.rstrip('/')}/health")
            else:
                httpx.get("http://localhost:8000/health")
        except Exception:
            pass

threading.Thread(target=keep_alive, daemon=True).start()

@app.get("/health")
async def health_check():
    return {"status": "ok"}

class TextInput(BaseModel):
    text: str

def parse_json_response(content: str) -> dict:
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    if content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    content = content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {}

@app.post("/api/text")
async def analyze_text(data: TextInput):
    system_prompt = (
        'You are MindScan, an empathetic mental health screening AI. Analyze the user\'s text for emotional content. '
        'Return ONLY valid JSON: {"reply": "compassionate response", "text_score": 0.5, "lime_words": '
        '[{"word": "example", "score": 0.8}], "detected_emotions": ["sadness"], "summary": "brief clinical summary"}'
    )
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "meta/llama-3.1-70b-instruct",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": data.text}
        ],
        "temperature": 0.2
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(NVIDIA_API_URL, json=payload, headers=headers, timeout=30.0)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        return parse_json_response(content)

@app.post("/api/voice")
async def analyze_voice(audio: UploadFile = File(...), transcript: str = Form(...)):
    system_prompt = (
        'Analyze this voice transcript for emotional content. Return ONLY valid JSON: {"voice_score": 0.5, '
        '"detected_voice_emotion": "Sadness", "emotional_indicators": ["tired"], "severity_notes": "observation"}'
    )
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "meta/llama-3.1-70b-instruct",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": transcript}
        ],
        "temperature": 0.2
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(NVIDIA_API_URL, json=payload, headers=headers, timeout=30.0)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        result = response.json()
        content = result["choices"][0]["message"]["content"]
        res_data = parse_json_response(content)
        res_data["transcript"] = transcript
        return res_data

@app.post("/api/vision")
async def analyze_vision(image: UploadFile = File(...), clientEmotions: str = Form("{}")):
    try:
        emotions_dict = json.loads(clientEmotions)
    except Exception:
        emotions_dict = {}
    return {
        "face_score": 0.5,
        "detected_face_emotion": "Neutral",
        "faces_detected": 1,
        "emotions": emotions_dict,
        "dominant_emotion": "Neutral",
        "emotion_confidence": 0.9
    }

class PHQ9Input(BaseModel):
    answers: List[int]

@app.post("/api/phq9")
async def calculate_phq9(data: PHQ9Input):
    total = sum(data.answers)
    score = total / 27.0
    if total <= 4:
        severity = "Minimal"
    elif total <= 9:
        severity = "Mild"
    elif total <= 14:
        severity = "Moderate"
    elif total <= 19:
        severity = "Moderately Severe"
    else:
        severity = "Severe"
    return {
        "phq9_score": score,
        "phq9_total": total,
        "phq9_severity": severity
    }

class CombinedInput(BaseModel):
    text_score: float
    face_score: float
    voice_score: float
    phq9_score: float

@app.post("/api/combined")
async def calculate_combined(data: CombinedInput):
    final = (data.text_score + data.face_score + data.voice_score + data.phq9_score) / 4.0
    if final < 0.2:
        risk = "Low"
    elif final < 0.5:
        risk = "Moderate"
    elif final < 0.8:
        risk = "High"
    else:
        risk = "Severe"
    silent = final > 0.6 and data.face_score < 0.3
    return {
        "final_score": final,
        "risk_level": risk,
        "silentDistress": silent,
        "text_score": data.text_score,
        "face_score": data.face_score,
        "voice_score": data.voice_score,
        "phq9_score": data.phq9_score
    }

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatInput(BaseModel):
    messages: List[ChatMessage]
    systemPrompt: Optional[str] = None

@app.post("/api/chat")
async def chat_endpoint(data: ChatInput):
    system_prompt = (
        "You are MindScan AI, a calm, supportive assistant. Provide short, non-clinical guidance. "
        "Avoid diagnosis. Suggest seeking professional help if the user mentions crisis, harm, or severe distress."
    )
    headers = {
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
        "Content-Type": "application/json"
    }
    api_messages = [{"role": "system", "content": system_prompt}]
    for msg in data.messages:
        api_messages.append({"role": msg.role, "content": msg.content})
    payload = {
        "model": "meta/llama-3.1-70b-instruct",
        "messages": api_messages,
        "temperature": 0.5
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(NVIDIA_API_URL, json=payload, headers=headers, timeout=30.0)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        result = response.json()
        return {"reply": result["choices"][0]["message"]["content"]}

class TTSInput(BaseModel):
    text: str

@app.post("/api/tts")
async def tts_endpoint(data: TTSInput):
    if not ELEVENLABS_VOICE_ID or not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs credentials missing")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    headers = {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "text": data.text,
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=30.0)
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return Response(content=response.content, media_type="audio/mpeg")

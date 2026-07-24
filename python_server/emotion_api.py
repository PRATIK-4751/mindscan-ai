import os
import sys
import base64
import urllib.request
from io import BytesIO

import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# --- Constants ---
EMOTIONS = ["Angry", "Disgust", "Fear", "Happy", "Neutral", "Sad", "Surprise"]
FACE_DETECTOR_PROTO = os.path.join(os.path.dirname(__file__), "deploy.prototxt")
FACE_DETECTOR_MODEL = os.path.join(os.path.dirname(__file__), "res10_300x300_ssd_iter_140000_fp16.caffemodel")
EMOTION_MODEL_PATH = os.path.join(os.path.dirname(__file__), "emotion_model.h5")
MODEL_SOURCE = r"C:\Users\rajpr\OneDrive\Desktop\test\emotion_model.h5"

# --- App ---
app = FastAPI(title="Emotion Detection API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Globals ---
emotion_model = None
face_net = None


def download_file(url: str, dest: str):
    print(f"Downloading {os.path.basename(dest)}...")
    urllib.request.urlretrieve(url, dest)
    print(f"Downloaded {os.path.basename(dest)} successfully!")


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
            fx = max(0, x1)
            fy = max(0, y1)
            fw = min(x2 - fx, frame.shape[1] - fx)
            fh = min(y2 - fy, frame.shape[0] - fy)
            if fw > 20 and fh > 20:
                faces.append([fx, fy, fw, fh, float(confidence)])
    return faces


def preprocess_face(gray, face_box):
    x, y, w, h = face_box[:4]
    roi = gray[y : y + h, x : x + w]
    if roi.size == 0 or w == 0 or h == 0:
        return None
    roi = cv2.resize(roi, (48, 48), interpolation=cv2.INTER_AREA)
    roi = roi.astype("float32") / 255.0
    return np.expand_dims(np.expand_dims(roi, axis=-1), axis=0)


@app.on_event("startup")
async def load_models():
    global emotion_model, face_net
    from tensorflow.keras.models import load_model

    # Copy model from source if not present
    if not os.path.exists(EMOTION_MODEL_PATH) and os.path.exists(MODEL_SOURCE):
        import shutil
        shutil.copy2(MODEL_SOURCE, EMOTION_MODEL_PATH)
        print(f"Copied emotion model from {MODEL_SOURCE}")

    if os.path.exists(EMOTION_MODEL_PATH):
        print("Loading emotion model...")
        emotion_model = load_model(EMOTION_MODEL_PATH)
        print("Emotion model loaded.")
    else:
        print("WARNING: emotion_model.h5 not found. Emotion detection will be unavailable.")

    print("Loading DNN face detector...")
    face_net = load_face_detector()
    print("Face detector loaded.")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "emotion_model_loaded": emotion_model is not None,
        "face_detector_loaded": face_net is not None,
    }


@app.post("/predict")
async def predict(image: UploadFile = File(...)):
    global emotion_model, face_net

    if emotion_model is None or face_net is None:
        raise HTTPException(status_code=503, detail="Models not loaded yet. Please try again in a moment.")

    # Read image bytes
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image data.")

    # Detect faces
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = detect_faces(frame, face_net, confidence_threshold=0.4)

    if not faces:
        return JSONResponse(
            content={
                "faces_detected": 0,
                "dominant_emotion": "Neutral",
                "confidence": 0.0,
                "emotions": {e: 0.0 for e in EMOTIONS},
                "face_box": None,
                "face_detection_confidence": None,
                "message": "No face detected in image.",
            }
        )

    # Use the largest face
    primary_face = max(faces, key=lambda f: f[2] * f[3])
    face_input = preprocess_face(gray, primary_face)

    if face_input is None:
        return JSONResponse(
            content={
                "faces_detected": len(faces),
                "dominant_emotion": "Neutral",
                "confidence": 0.0,
                "emotions": {e: 0.0 for e in EMOTIONS},
                "face_box": None,
                "face_detection_confidence": None,
                "message": "Could not preprocess face region.",
            }
        )

    # Predict
    probs = emotion_model.predict(face_input, verbose=0)[0]
    best_idx = int(np.argmax(probs))
    emotion_scores = {EMOTIONS[i]: round(float(probs[i]), 4) for i in range(len(EMOTIONS))}

    return JSONResponse(
        content={
            "faces_detected": len(faces),
            "dominant_emotion": EMOTIONS[best_idx],
            "confidence": round(float(probs[best_idx]), 4),
            "emotions": emotion_scores,
            "face_box": {"x": int(primary_face[0]), "y": int(primary_face[1]), "w": int(primary_face[2]), "h": int(primary_face[3])},
            "face_detection_confidence": float(primary_face[4]) if len(primary_face) > 4 else None,
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5000)

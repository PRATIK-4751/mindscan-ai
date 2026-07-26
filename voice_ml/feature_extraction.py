"""
Librosa-based voice feature extraction for depression screening.
Extracts prosodic and spectral features from audio files.
"""

import librosa
import numpy as np
from typing import Dict, Optional


def extract_features(
    audio_path: str,
    sr: int = 22050,
    duration: Optional[float] = None,
) -> Dict[str, float]:
    """
    Extract comprehensive audio features from a voice recording.
    
    Returns a dict of ~40 features:
    - Pitch: mean, std, range, jitter
    - Energy: mean, std
    - Speech rate: speaking rate estimates
    - MFCCs: 13 coefficients + deltas
    - Spectral: centroid, bandwidth, rolloff, contrast, flatness
    - Chroma: 12 chroma features
    - Zero crossing rate
    - Tempo
    """
    y, sr = librosa.load(audio_path, sr=sr, duration=duration)
    
    features = {}
    
    # --- Pitch (F0) features ---
    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
    pitch_values = []
    for t in range(pitches.shape[1]):
        idx = magnitudes[:, t].argmax()
        if magnitudes[idx, t] > 0:
            pitch_values.append(pitches[idx, t])
    
    if pitch_values:
        pitch_arr = np.array(pitch_values)
        features["pitch_mean"] = float(np.mean(pitch_arr))
        features["pitch_std"] = float(np.std(pitch_arr))
        features["pitch_range"] = float(np.ptp(pitch_arr))
        # Jitter: pitch perturbation
        if len(pitch_arr) > 1:
            features["pitch_jitter"] = float(np.mean(np.abs(np.diff(pitch_arr))) / (np.mean(pitch_arr) + 1e-6))
        else:
            features["pitch_jitter"] = 0.0
    else:
        features["pitch_mean"] = 0.0
        features["pitch_std"] = 0.0
        features["pitch_range"] = 0.0
        features["pitch_jitter"] = 0.0
    
    # --- Energy features ---
    rms = librosa.feature.rms(y=y)[0]
    features["energy_mean"] = float(np.mean(rms))
    features["energy_std"] = float(np.std(rms))
    
    # --- Speech rate (approximate via onset detection) ---
    onsets = librosa.onset.onset_detect(y=y, sr=sr)
    duration_sec = librosa.get_duration(y=y, sr=sr)
    features["speech_rate"] = float(len(onsets) / (duration_sec + 1e-6))
    features["duration"] = float(duration_sec)
    
    # --- MFCCs (13 coefficients + delta + delta-delta = 39 total) ---
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    delta_mfccs = librosa.feature.delta(mfccs)
    delta2_mfccs = librosa.feature.delta(mfccs, order=2)
    
    for i in range(13):
        features[f"mfcc_{i}_mean"] = float(np.mean(mfccs[i]))
        features[f"mfcc_{i}_std"] = float(np.std(mfccs[i]))
        features[f"dmfcc_{i}_mean"] = float(np.mean(delta_mfccs[i]))
        features[f"d2mfcc_{i}_mean"] = float(np.mean(delta2_mfccs[i]))
    
    # --- Spectral features ---
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    features["spectral_centroid_mean"] = float(np.mean(spectral_centroid))
    features["spectral_centroid_std"] = float(np.std(spectral_centroid))
    
    spectral_bandwidth = librosa.feature.spectral_bandwidth(y=y, sr=sr)[0]
    features["spectral_bandwidth_mean"] = float(np.mean(spectral_bandwidth))
    
    spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)[0]
    features["spectral_rolloff_mean"] = float(np.mean(spectral_rolloff))
    
    spectral_contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
    for i in range(spectral_contrast.shape[0]):
        features[f"spectral_contrast_{i}"] = float(np.mean(spectral_contrast[i]))
    
    spectral_flatness = librosa.feature.spectral_flatness(y=y)[0]
    features["spectral_flatness_mean"] = float(np.mean(spectral_flatness))
    
    # --- Chroma features ---
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    for i in range(chroma.shape[0]):
        features[f"chroma_{i}"] = float(np.mean(chroma[i]))
    
    # --- Zero crossing rate ---
    zcr = librosa.feature.zero_crossing_rate(y)[0]
    features["zcr_mean"] = float(np.mean(zcr))
    features["zcr_std"] = float(np.std(zcr))
    
    # --- Tempo ---
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    if hasattr(tempo, '__len__'):
        features["tempo"] = float(tempo[0]) if len(tempo) > 0 else 0.0
    else:
        features["tempo"] = float(tempo)
    
    return features


def features_to_vector(features: Dict[str, float]) -> np.ndarray:
    """Convert feature dict to ordered numpy array for ML model input."""
    # Sort by key for consistency
    sorted_keys = sorted(features.keys())
    return np.array([features[k] for k in sorted_keys], dtype=np.float32)


def get_feature_names(features: Dict[str, float]) -> list:
    """Return sorted feature names matching the vector order."""
    return sorted(features.keys())


# Emotion mapping for RAVDESS
RAVDESS_EMOTIONS = {
    "01": "neutral",
    "02": "calm",
    "03": "happy",
    "04": "sad",
    "05": "angry",
    "06": "fearful",
    "07": "disgust",
    "08": "surprised",
}

# Mapping to depression-relevant categories
EMOTION_DEPRESSION_MAP = {
    "neutral": "low",
    "calm": "low",
    "happy": "low",
    "sad": "high",
    "angry": "medium",
    "fearful": "high",
    "disgust": "medium",
    "surprised": "low",
}

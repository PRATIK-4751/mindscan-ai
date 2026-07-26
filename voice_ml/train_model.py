"""
Training script for voice emotion classifier.
Supports RAVDESS and CREMA-D datasets.
Outputs a trained model for depression screening inference.
"""

import os
import glob
import json
import pickle
import numpy as np
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import joblib

from feature_extraction import (
    extract_features,
    features_to_vector,
    get_feature_names,
    RAVDESS_EMOTIONS,
)


def parse_ravdess_filename(filename: str) -> dict:
    """
    Parse RAVDESS filename to extract metadata.
    Format: {Actor}_{Intensity}_{Statements}_{Repetition}_{Emotion}_{Face}.wav
    Example: 03-01-01-01-01-01-01.wav
    """
    parts = Path(filename).stem.split("-")
    if len(parts) >= 5:
        return {
            "modality": parts[0],    # 01=neutral, 02=calm, 03=happy...
            "vocal_channel": parts[1],  # 01=speech, 02=song
            "emotion_code": parts[2],   # 01-08 emotion
            "intensity": parts[3],      # 01=normal, 02=strong
            "statement": parts[4],      # 01="kids are talking", 02="dogs are sitting"
            "repetition": parts[5],     # 01=1st, 02=2nd
            "actor": parts[6],          # actor number
        }
    return {}


def load_ravdess(dataset_path: str) -> list:
    """
    Load RAVDESS dataset.
    Returns list of (audio_path, emotion_label) tuples.
    """
    samples = []
    
    # RAVDESS has actor folders
    for actor_dir in sorted(glob.glob(os.path.join(dataset_path, "Actor_*"))):
        if not os.path.isdir(actor_dir):
            continue
        
        for wav_file in glob.glob(os.path.join(actor_dir, "*.wav")):
            filename = os.path.basename(wav_file)
            parsed = parse_ravdess_filename(filename)
            
            if not parsed:
                continue
            
            # Only speech (not song) for depression screening
            if parsed.get("vocal_channel") != "01":
                continue
            
            emotion_code = parsed.get("emotion_code", "")
            emotion = RAVDESS_EMOTIONS.get(emotion_code, None)
            
            if emotion:
                samples.append((wav_file, emotion))
    
    return samples


def load_crema_d(dataset_path: str) -> list:
    """
    Load CREMA-D dataset.
    Format: {ActorID}_{Emotion}_{Intensity}_{Statement}_{Repetition}.wav
    Emotions: ANG, DIS, FEA, HAP, NEU, SAD
    """
    emotion_map = {
        "ANG": "angry",
        "DIS": "disgust",
        "FEA": "fearful",
        "HAP": "happy",
        "NEU": "neutral",
        "SAD": "sad",
    }
    
    samples = []
    
    for wav_file in glob.glob(os.path.join(dataset_path, "*.wav")):
        filename = Path(wav_file).stem
        parts = filename.split("_")
        
        if len(parts) >= 2:
            emotion_code = parts[1]
            emotion = emotion_map.get(emotion_code, None)
            
            if emotion:
                samples.append((wav_file, emotion))
    
    return samples


def extract_dataset_features(samples: list, max_per_class: int = 200) -> tuple:
    """
    Extract features from a list of (path, emotion) samples.
    Returns X (feature matrix), y (labels), feature_names.
    """
    # Balance classes
    from collections import Counter
    counts = Counter(label for _, label in samples)
    min_count = min(counts.values())
    cap = min(min_count, max_per_class)
    
    balanced_samples = []
    class_counts = Counter()
    for path, label in samples:
        if class_counts[label] < cap:
            balanced_samples.append((path, label))
            class_counts[label] += 1
    
    print(f"Extracting features from {len(balanced_samples)} samples...")
    print(f"Class distribution: {dict(class_counts)}")
    
    X_list = []
    y_list = []
    feature_names = None
    
    for i, (audio_path, emotion) in enumerate(balanced_samples):
        try:
            features = extract_features(audio_path, duration=10.0)
            vec = features_to_vector(features)
            
            if feature_names is None:
                feature_names = get_feature_names(features)
            
            X_list.append(vec)
            y_list.append(emotion)
            
            if (i + 1) % 50 == 0:
                print(f"  Processed {i+1}/{len(balanced_samples)} samples")
        except Exception as e:
            print(f"  Error processing {audio_path}: {e}")
            continue
    
    return np.array(X_list), np.array(y_list), feature_names


def train_model(X: np.ndarray, y: np.ndarray, feature_names: list) -> dict:
    """
    Train emotion classification model.
    Returns dict with model, scaler, encoder, feature_names, metrics.
    """
    # Encode labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    print(f"\nTraining set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")
    print(f"Features: {X_train.shape[1]}")
    print(f"Classes: {list(le.classes_)}")
    
    # Train Random Forest
    print("\nTraining Random Forest...")
    rf_model = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1,
    )
    rf_model.fit(X_train, y_train)
    
    rf_train_acc = rf_model.score(X_train, y_train)
    rf_test_acc = rf_model.score(X_test, y_test)
    print(f"Random Forest - Train: {rf_train_acc:.3f}, Test: {rf_test_acc:.3f}")
    
    # Cross-validation
    cv_scores = cross_val_score(rf_model, X_scaled, y_encoded, cv=5, n_jobs=-1)
    print(f"Cross-val accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std():.3f})")
    
    # Classification report
    y_pred = rf_model.predict(X_test)
    report = classification_report(y_test, y_pred, target_names=le.classes_, output_dict=True)
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    # Feature importance
    importances = rf_model.feature_importances_
    top_features = sorted(
        zip(feature_names, importances),
        key=lambda x: x[1],
        reverse=True,
    )[:20]
    
    print("\nTop 20 Features:")
    for name, imp in top_features:
        print(f"  {name}: {imp:.4f}")
    
    return {
        "model": rf_model,
        "scaler": scaler,
        "encoder": le,
        "feature_names": feature_names,
        "metrics": {
            "train_accuracy": float(rf_train_acc),
            "test_accuracy": float(rf_test_acc),
            "cross_val_mean": float(cv_scores.mean()),
            "cross_val_std": float(cv_scores.std()),
            "classification_report": report,
            "top_features": [(name, float(imp)) for name, imp in top_features],
        },
    }


def save_model(result: dict, output_dir: str = "models"):
    """Save trained model and associated artifacts."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Save model
    joblib.dump(result["model"], os.path.join(output_dir, "voice_classifier.pkl"))
    
    # Save scaler
    joblib.dump(result["scaler"], os.path.join(output_dir, "feature_scaler.pkl"))
    
    # Save label encoder
    joblib.dump(result["encoder"], os.path.join(output_dir, "label_encoder.pkl"))
    
    # Save metadata
    metadata = {
        "feature_names": result["feature_names"],
        "num_features": len(result["feature_names"]),
        "classes": list(result["encoder"].classes_),
        "metrics": result["metrics"],
    }
    
    with open(os.path.join(output_dir, "model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\nModel saved to {output_dir}/")
    print(f"  - voice_classifier.pkl")
    print(f"  - feature_scaler.pkl")
    print(f"  - label_encoder.pkl")
    print(f"  - model_metadata.json")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Train voice emotion classifier")
    parser.add_argument("--ravdess", type=str, help="Path to RAVDESS dataset")
    parser.add_argument("--crema-d", type=str, help="Path to CREMA-D dataset")
    parser.add_argument("--output", type=str, default="models", help="Output directory")
    parser.add_argument("--max-per-class", type=int, default=200)
    args = parser.parse_args()
    
    all_samples = []
    
    if args.ravdess:
        print(f"Loading RAVDESS from {args.ravdess}...")
        ravdess_samples = load_ravdess(args.ravdess)
        print(f"  Found {len(ravdess_samples)} speech samples")
        all_samples.extend(ravdess_samples)
    
    if args.crema_d:
        print(f"Loading CREMA-D from {args.crema_d}...")
        crema_samples = load_crema_d(args.crema_d)
        print(f"  Found {len(crema_samples)} samples")
        all_samples.extend(crema_samples)
    
    if not all_samples:
        print("No dataset specified! Use --ravdess or --crema-d")
        print("Example:")
        print("  python train_model.py --ravdess ./RAVDESS --output ./models")
        exit(1)
    
    print(f"\nTotal samples: {len(all_samples)}")
    
    # Extract features
    X, y, feature_names = extract_dataset_features(all_samples, args.max_per_class)
    
    # Train
    result = train_model(X, y, feature_names)
    
    # Save
    save_model(result, args.output)

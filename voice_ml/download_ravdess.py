"""
Download RAVDESS dataset from Zenodo.
Run: python download_ravdess.py
"""

import os
import zipfile
import urllib.request
from pathlib import Path

RAVDESS_URL = "https://zenodo.org/record/1188976/files/Audio_Speech_Actors_01-24.zip"
RAVDESS_SONG_URL = "https://zenodo.org/record/1188976/files/Audio_Song_Actors_01-24.zip"

def download_file(url: str, output_path: str):
    """Download file with progress."""
    print(f"Downloading: {url}")
    print(f"Destination: {output_path}")
    
    def progress(block_num, block_size, total_size):
        downloaded = block_num * block_size
        percent = min(100, downloaded * 100 / total_size)
        mb_downloaded = downloaded / (1024 * 1024)
        mb_total = total_size / (1024 * 1024)
        print(f"\r  {percent:.1f}% ({mb_downloaded:.1f}/{mb_total:.1f} MB)", end="", flush=True)
    
    urllib.request.urlretrieve(url, output_path, reporthook=progress)
    print()  # newline after progress


def extract_zip(zip_path: str, extract_dir: str):
    """Extract zip file."""
    print(f"Extracting {zip_path}...")
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(extract_dir)
    print(f"Extracted to {extract_dir}")


if __name__ == "__main__":
    output_dir = Path("./ravdess_data")
    output_dir.mkdir(exist_ok=True)
    
    zip_path = output_dir / "Audio_Speech_Actors_01-24.zip"
    
    # Download speech data (we only need speech, not song)
    if not zip_path.exists():
        download_file(RAVDESS_URL, str(zip_path))
    else:
        print(f"Zip already exists: {zip_path}")
    
    # Extract
    extract_dir = output_dir / "RAVDESS"
    if not extract_dir.exists():
        extract_zip(str(zip_path), str(extract_dir))
    else:
        print(f"Already extracted: {extract_dir}")
    
    # Count files
    wav_count = sum(1 for _ in extract_dir.rglob("*.wav"))
    print(f"\nDone! Found {wav_count} WAV files in {extract_dir}")
    print(f"\nTo train the model, run:")
    print(f"  python train_model.py --ravdess {extract_dir} --output ./models")

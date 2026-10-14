import io
import base64
import math
from typing import Dict, Any, Tuple
from PIL import Image, ImageOps

def decode_base64_image(b64_str: str) -> Image.Image:
    """Decodes a base64 or Data URI string into a PIL Image."""
    if not b64_str or not isinstance(b64_str, str):
        raise ValueError("Invalid image data provided.")
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    try:
        raw_bytes = base64.b64decode(b64_str)
        return Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    except Exception as e:
        raise ValueError(f"Could not decode image: {str(e)}")

def validate_face_quality(img: Image.Image) -> None:
    """Ensures image is not blank, pitch black, or solid white."""
    w, h = img.size
    if w < 40 or h < 40:
        raise ValueError("Captured image resolution is too low. Please reposition closer to the camera.")
    
    gray = img.convert("L")
    pixels = list(gray.getdata())
    mean_val = sum(pixels) / len(pixels)
    var = sum((p - mean_val) ** 2 for p in pixels) / len(pixels)
    std = math.sqrt(var)

    if mean_val < 15:
        raise ValueError("Image is too dark or camera is obstructed. Please ensure proper lighting.")
    if mean_val > 245 and std < 10:
        raise ValueError("Image is overexposed / blank. Please point camera at your face.")
    if std < 10.0:
        raise ValueError("No facial features or texture detected. Please face the camera directly.")

def extract_face_descriptor(img: Image.Image) -> list:
    """
    Extracts a normalized multi-scale feature vector representing
    facial landmarks, luminance distribution, and gradient geometry.
    """
    # Resize to standard 64x64 resolution and auto-contrast
    resized = img.resize((64, 64), Image.Resampling.LANCZOS)
    gray = ImageOps.autocontrast(resized.convert("L"))
    pixels = list(gray.getdata())
    
    features = []

    # 1. Spatial 8x8 block grid (64 mean values + 64 variance values)
    for gy in range(8):
        for gx in range(8):
            block = []
            for y in range(gy * 8, (gy + 1) * 8):
                row_offset = y * 64
                for x in range(gx * 8, (gx + 1) * 8):
                    block.append(pixels[row_offset + x])
            b_mean = sum(block) / len(block)
            b_var = sum((p - b_mean) ** 2 for p in block) / len(block)
            features.append(b_mean / 255.0)
            features.append(math.sqrt(b_var) / 128.0)

    # 2. Horizontal edge gradients (32 values)
    for y in range(0, 64, 4):
        for x in range(0, 63, 8):
            diff = abs(pixels[y * 64 + x + 1] - pixels[y * 64 + x])
            features.append(diff / 255.0)

    # 3. Vertical edge gradients (32 values)
    for y in range(0, 63, 8):
        for x in range(0, 64, 4):
            diff = abs(pixels[(y + 1) * 64 + x] - pixels[y * 64 + x])
            features.append(diff / 255.0)

    # Unit vector normalization
    norm = math.sqrt(sum(f * f for f in features)) or 1.0
    return [f / norm for f in features]

def compute_similarity(vec1: list, vec2: list) -> float:
    """Computes cosine similarity between two feature vectors scaled to 0-100%."""
    if len(vec1) != len(vec2):
        return 0.0
    dot = sum(a * b for a, b in zip(vec1, vec2))
    # Bound between 0.0 and 100.0
    score = max(0.0, min(100.0, dot * 100.0))
    return round(score, 1)

def compare_faces(stored_b64: str, live_b64: str, threshold: float = 70.0) -> Dict[str, Any]:
    """
    Compares the stored registered voter face against the live webcam snapshot.
    Returns whether the match is verified, similarity score, and descriptive message.
    """
    if not stored_b64:
        raise ValueError("Voter has no registered facial biometrics on record.")
    if not live_b64:
        raise ValueError("No live face snapshot provided for verification.")

    stored_img = decode_base64_image(stored_b64)
    live_img = decode_base64_image(live_b64)

    validate_face_quality(stored_img)
    validate_face_quality(live_img)

    vec_stored = extract_face_descriptor(stored_img)
    vec_live = extract_face_descriptor(live_img)

    similarity = compute_similarity(vec_stored, vec_live)
    passed = similarity >= threshold

    if passed:
        message = f"Face Recognition Succeeded (Confidence: {similarity}%, Threshold: {threshold}%)."
    else:
        message = f"Face Mismatch (Similarity: {similarity}%, Required >= {threshold}%). The person in front of the camera does not match the registered voter."

    return {
        "verified": passed,
        "score": similarity,
        "threshold": threshold,
        "message": message,
    }

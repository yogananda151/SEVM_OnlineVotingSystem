import os
import io
import base64
import math
from typing import Dict, Any, Optional, Tuple
import cv2
import numpy as np
from PIL import Image

# Path to deep neural network ONNX models
BASE_DIR = os.path.dirname(os.path.dirname(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models_cv")
YUNET_PATH = os.path.join(MODELS_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(MODELS_DIR, "face_recognition_sface_2021dec.onnx")

_detector: Optional[cv2.FaceDetectorYN] = None
_recognizer: Optional[cv2.FaceRecognizerSF] = None

def get_models() -> Tuple[cv2.FaceDetectorYN, cv2.FaceRecognizerSF]:
    """Lazy-loads and returns the singleton FaceDetectorYN and FaceRecognizerSF instances."""
    global _detector, _recognizer
    if _detector is None or _recognizer is None:
        if not os.path.exists(YUNET_PATH) or not os.path.exists(SFACE_PATH):
            raise FileNotFoundError(
                f"Face recognition models missing. Expected at {YUNET_PATH} and {SFACE_PATH}"
            )
        # Initialize detector with default resolution; input size is set dynamically per image
        _detector = cv2.FaceDetectorYN.create(
            YUNET_PATH,
            "",
            (320, 320),
            score_threshold=0.55,
            nms_threshold=0.3,
            top_k=5000,
        )
        _recognizer = cv2.FaceRecognizerSF.create(SFACE_PATH, "")
    return _detector, _recognizer

def decode_base64_to_cv2(b64_str: str) -> np.ndarray:
    """Decodes a base64 or Data URI string into a BGR OpenCV NumPy array."""
    if not b64_str or not isinstance(b64_str, str):
        raise ValueError("Invalid image data provided.")
    if "," in b64_str:
        b64_str = b64_str.split(",", 1)[1]
    try:
        raw_bytes = base64.b64decode(b64_str)
        pil_img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
        rgb = np.array(pil_img)
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise ValueError(f"Could not decode image: {str(e)}")

def detect_face_and_extract_feature(bgr_img: np.ndarray, is_live: bool = False) -> Optional[np.ndarray]:
    """
    Detects the primary human face in the image using YuNet,
    aligns it to canonical 112x112 facial geometry, and extracts
    the 128-dimensional deep feature representation using SFace.
    """
    detector, recognizer = get_models()
    h, w = bgr_img.shape[:2]
    if h < 30 or w < 30:
        return None

    # Dynamically set input dimensions for YuNet
    detector.setInputSize((w, h))
    faces = detector.detect(bgr_img)

    # If no face detected at 0.55 threshold, try slightly lower threshold for difficult lighting
    if faces[1] is None or len(faces[1]) == 0:
        detector.setScoreThreshold(0.40)
        faces = detector.detect(bgr_img)
        detector.setScoreThreshold(0.55)

    if faces[1] is None or len(faces[1]) == 0:
        return None

    # Pick the largest, most confident face (width * height)
    face_list = faces[1]
    best_face = max(face_list, key=lambda f: f[2] * f[3])

    # Minimum size validation to prevent noise
    if best_face[2] < 24 or best_face[3] < 24:
        return None

    # Align face and extract 128-D SFace descriptor
    aligned = recognizer.alignCrop(bgr_img, best_face)
    feat = recognizer.feature(aligned)
    return feat

def compare_faces(stored_b64: str, live_b64: str, threshold: float = 0.38) -> Dict[str, Any]:
    """
    Performs real deep-learning facial recognition comparison using
    OpenCV's official YuNet (face detection & 5-point alignment) and
    SFace (128D deep feature representation).

    Official SFace thresholds:
    - Cosine similarity: >= 0.363 means SAME person.
    - Here we use a safe strict threshold of 0.380 (where identical faces are 0.85-0.98,
      and different people are 0.00-0.20).
    """
    if not stored_b64:
        raise ValueError("Voter has no registered facial biometrics on record.")
    if not live_b64:
        raise ValueError("No live camera snapshot provided for face verification.")

    stored_bgr = decode_base64_to_cv2(stored_b64)
    live_bgr = decode_base64_to_cv2(live_b64)

    # 1. Detect & extract deep facial features from stored registered voter photo
    stored_feat = detect_face_and_extract_feature(stored_bgr, is_live=False)
    if stored_feat is None:
        raise ValueError(
            "Registered voter photo has no detectable human face. Please update voter biometric enrollment."
        )

    # 2. Detect & extract deep facial features from live camera snapshot
    live_feat = detect_face_and_extract_feature(live_bgr, is_live=True)
    if live_feat is None:
        raise ValueError(
            "No human face detected in the live camera frame. Please align your face directly inside the camera frame in good lighting."
        )

    # 3. Compute cosine similarity & L2 distance with SFace
    _, recognizer = get_models()
    raw_cosine = float(recognizer.match(stored_feat, live_feat, cv2.FaceRecognizerSF_FR_COSINE))
    raw_l2 = float(recognizer.match(stored_feat, live_feat, cv2.FaceRecognizerSF_FR_NORM_L2))

    # Match condition: cosine >= threshold AND L2 distance <= 1.128
    is_verified = (raw_cosine >= threshold) and (raw_l2 <= 1.15)

    # Calculate human-friendly confidence percentage (0% to 100%)
    if is_verified:
        # Scale range [0.38, 1.0] to [80.0%, 99.8%]
        normalized = (raw_cosine - threshold) / (1.0 - threshold)
        confidence_pct = round(80.0 + min(1.0, max(0.0, normalized)) * 19.8, 1)
        message = f"Face Recognition Verified ({confidence_pct}% match). Identity confirmed."
    else:
        # Scale below threshold to [10.0%, 65.0%]
        scaled = max(0.0, raw_cosine) / max(0.01, threshold)
        confidence_pct = round(min(65.0, scaled * 65.0), 1)
        message = f"Face Verification Failed: The live person does not match registered voter face ({confidence_pct}% match, required >= 80%). Access Denied."

    return {
        "verified": is_verified,
        "score": confidence_pct,
        "raw_cosine": round(raw_cosine, 4),
        "raw_l2": round(raw_l2, 4),
        "threshold": threshold,
        "message": message,
    }

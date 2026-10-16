import os
import sys
import hashlib
import urllib.request
import tempfile
import shutil

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET_DIR = os.path.join(BASE_DIR, "app", "models_cv")
os.makedirs(TARGET_DIR, exist_ok=True)

MODELS = {
    "face_detection_yunet_2023mar.onnx": {
        "url": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        "min_size": 200000,
        "expected_sha256": "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4",
    },
    "face_recognition_sface_2021dec.onnx": {
        "url": "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
        "min_size": 35000000,
        "expected_sha256": "0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79",
    },
}

def verify_file(filepath: str, min_size: int, expected_sha: str = "") -> bool:
    if not os.path.exists(filepath):
        return False
    size = os.path.getsize(filepath)
    if size < min_size:
        return False
    if expected_sha:
        h = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        if h.hexdigest().lower() != expected_sha.lower():
            return False
    return True

def download_model(name: str, meta: dict):
    dest = os.path.join(TARGET_DIR, name)
    if verify_file(dest, meta["min_size"], meta.get("expected_sha256", "")):
        print(f"[OK] Model {name} already present and verified ({os.path.getsize(dest)} bytes).")
        return

    print(f"[*] Downloading {name} from OpenCV Zoo...")
    req = urllib.request.Request(
        meta["url"],
        headers={"User-Agent": "Smart-EVM-Model-Loader/1.0"}
    )
    
    with tempfile.NamedTemporaryFile(delete=False, dir=TARGET_DIR) as tmp:
        tmp_name = tmp.name
        with urllib.request.urlopen(req, timeout=120) as resp:
            shutil.copyfileobj(resp, tmp)

    if verify_file(tmp_name, meta["min_size"]):
        shutil.move(tmp_name, dest)
        print(f"[OK] Downloaded and verified {name} ({os.path.getsize(dest)} bytes).")
    else:
        if os.path.exists(tmp_name):
            os.remove(tmp_name)
        raise RuntimeError(f"Failed to verify downloaded model {name}. Size or integrity check failed.")

def main():
    print(f"[*] Ensuring neural network face models in {TARGET_DIR}...")
    for name, meta in MODELS.items():
        try:
            download_model(name, meta)
        except Exception as e:
            print(f"[ERROR] Could not prepare model {name}: {e}", file=sys.stderr)
            sys.exit(1)
    print("[OK] All required OpenCV ONNX face models are ready.")

if __name__ == "__main__":
    main()

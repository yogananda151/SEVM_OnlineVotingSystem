import os
import urllib.request

target_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", "models_cv")
os.makedirs(target_dir, exist_ok=True)

models = {
    "face_detection_yunet_2023mar.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "face_recognition_sface_2021dec.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx",
}

for name, url in models.items():
    dest = os.path.join(target_dir, name)
    if not os.path.exists(dest) or os.path.getsize(dest) < 200000:
        print(f"Downloading {name}...")
        urllib.request.urlretrieve(url, dest)
        print(f"Saved {name} ({os.path.getsize(dest)} bytes)")
    else:
        print(f"Model {name} already exists ({os.path.getsize(dest)} bytes).")
print("All neural network face models are ready!")

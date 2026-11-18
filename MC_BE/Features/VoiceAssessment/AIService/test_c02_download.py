
import os
from dotenv import load_dotenv
from huggingface_hub import snapshot_download

load_dotenv()

REPO = "nozero23061311/mseek-clarity-v10"
TOKEN = os.getenv("HF_TOKEN")

print("=" * 60)
print("C02 - SNAPSHOT DOWNLOAD TEST")
print("=" * 60)

assert TOKEN, "Missing HF_TOKEN"

print("\n[1] DOWNLOADING C02")

folder = snapshot_download(
    repo_id=REPO,
    repo_type="model",
    token=TOKEN,
    max_workers=2
)

print("DOWNLOAD: PASS")
print("LOCAL PATH:", folder)

print("\n[2] CHECK REQUIRED FILES")

from pathlib import Path

folder = Path(folder)

required_files = [
    "c02_v10_model.joblib",
    "metadata.json",
    "sha256.json"
]

for filename in required_files:
    path = folder / filename

    print(filename, ":", path.exists())

    assert path.is_file(), f"Missing: {filename}"

print("\nC02 DOWNLOAD: PASS")
print("=" * 60)

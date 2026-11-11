
import os
import time
import hashlib

from dotenv import load_dotenv
from huggingface_hub import hf_hub_download, HfApi

load_dotenv(override=True)

TOKEN = os.getenv("HF_TOKEN")
REPO = "nozero23061311/mseek-pronunciation-v4-b"
FILENAME = "best_checkpoint.pt"

EXPECTED_SHA256 = (
    "7878654f1c49e5d4ed87299e9b0960a41cb1c8082f4cbdddbc463e9a1ce89a97"
)

assert TOKEN, "HF_TOKEN chưa được nạp"

print("=" * 60)
print("STEP 3.5.5 — V4-B CHECKPOINT DOWNLOAD")
print("=" * 60)

# 1. Verify repository access
api = HfApi()

info = None

for attempt in range(1, 6):
    try:
        info = api.model_info(
            REPO,
            token=TOKEN,
            timeout=90,
        )
        print("REPOSITORY: PASS")
        print("REVISION:", info.sha)
        break
    except Exception as e:
        print(f"Metadata attempt {attempt}: {type(e).__name__}")
        if attempt == 5:
            raise
        time.sleep(5 * attempt)

# 2. Download checkpoint
checkpoint_path = None

for attempt in range(1, 6):
    try:
        print(f"\nDOWNLOAD ATTEMPT: {attempt}")

        checkpoint_path = hf_hub_download(
            repo_id=REPO,
            filename=FILENAME,
            repo_type="model",
            revision=info.sha,
            token=TOKEN,
            force_download=False,
        )

        print("DOWNLOAD: PASS")
        break

    except Exception as e:
        print("DOWNLOAD ERROR:", type(e).__name__, str(e)[:500])

        if attempt == 5:
            raise

        time.sleep(10 * attempt)

# 3. Verify SHA256
print("\n[3] SHA256 VERIFICATION")

sha = hashlib.sha256()

with open(checkpoint_path, "rb") as f:
    for chunk in iter(lambda: f.read(8 * 1024 * 1024), b""):
        sha.update(chunk)

actual = sha.hexdigest()

print("Expected:", EXPECTED_SHA256)
print("Actual:  ", actual)

assert actual == EXPECTED_SHA256, "CHECKPOINT HASH MISMATCH"

print("\nCHECKPOINT: VERIFIED")
print("PATH:", checkpoint_path)
print("TRAINING: NO")
print("CHECKPOINT MODIFICATION: NO")
print("=" * 60)

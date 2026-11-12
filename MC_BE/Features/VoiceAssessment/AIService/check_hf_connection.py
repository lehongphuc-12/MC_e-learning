
import os
import time
import httpx
from dotenv import load_dotenv
from huggingface_hub import HfApi

load_dotenv(override=True)

TOKEN = os.getenv("HF_TOKEN")
REPO = "nozero23061311/mseek-pronunciation-v4-b"

assert TOKEN, "Không tìm thấy HF_TOKEN"

print("=" * 55)
print("STEP 3.5.4 — HUGGING FACE CONNECTION DIAGNOSTIC")
print("=" * 55)

# 1. Authenticated HTTP request
print("\n[1] AUTHENTICATED HTTP")

try:
    response = httpx.get(
        "https://huggingface.co/api/whoami-v2",
        headers={"Authorization": f"Bearer {TOKEN}"},
        timeout=30,
    )
    print("HTTP STATUS:", response.status_code)

    if response.status_code == 200:
        print("AUTHENTICATION: PASS")
    else:
        print("AUTHENTICATION: FAIL")
        print("Response:", response.text[:300])
except Exception as e:
    print("HTTP ERROR:", repr(e))

# 2. Repository metadata with retry
print("\n[2] REPOSITORY METADATA")

api = HfApi()

for attempt in range(1, 4):
    try:
        info = api.model_info(
            REPO,
            token=TOKEN,
            timeout=60,
        )

        print("METADATA: PASS")
        print("REVISION:", info.sha)

        for file in info.siblings:
            print("FILE:", file.rfilename)

        break

    except Exception as e:
        print(f"ATTEMPT {attempt}: {type(e).__name__}: {e}")
        if attempt < 3:
            time.sleep(5)
else:
    print("METADATA: FAILED")

# 3. Network endpoint checks
print("\n[3] DNS")

import socket

hosts = [
    "huggingface.co",
    "cas-bridge.xethub.hf.co",
    "transfer.xethub.hf.co",
    "cdn-lfs.huggingface.co",
]

for host in hosts:
    try:
        addresses = socket.getaddrinfo(host, 443)
        print(host, "PASS", sorted(set(x[4][0] for x in addresses)))
    except Exception as e:
        print(host, "FAIL", str(e))

print("\nDIAGNOSTIC COMPLETE")

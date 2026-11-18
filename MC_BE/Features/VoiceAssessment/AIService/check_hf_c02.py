
import os
from dotenv import load_dotenv
from huggingface_hub import HfApi

print("=" * 60)
print("C02 - HUGGING FACE ACCESS TEST")
print("=" * 60)

# Load environment
load_dotenv()

token = os.getenv("HF_TOKEN")

print("\n[1] TOKEN")

print("Configured:", bool(token))

if not token:
    raise RuntimeError("HF_TOKEN is missing from .env")

# Authenticate
print("\n[2] AUTHENTICATION")

api = HfApi(token=token)

user = api.whoami()

print("HF USER:", user.get("name"))

# Repository check
print("\n[3] C02 REPOSITORY")

REPO = "nozero23061311/mseek-clarity-v10"

try:
    repo = api.model_info(REPO)

    print("REPO:", repo.id)
    print("PRIVATE:", repo.private)

except Exception as exc:
    print("REPOSITORY ACCESS: FAILED")
    print("ERROR:", type(exc).__name__)
    print("DETAIL:", str(exc))

    raise

# File check
print("\n[4] REPOSITORY FILES")

files = api.list_repo_files(
    repo_id=REPO,
    repo_type="model",
    token=token
)

for filename in files:
    print(filename)

required = [
    "c02_v10_model.joblib",
    "metadata.json",
]

missing = [
    filename
    for filename in required
    if filename not in files
]

assert not missing, f"Missing files: {missing}"

print("\nC02 REPOSITORY ACCESS: PASS")

print("=" * 60)

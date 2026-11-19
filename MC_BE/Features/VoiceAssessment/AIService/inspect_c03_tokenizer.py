
import json
from pathlib import Path

from huggingface_hub import snapshot_download

REPO = "nozero23061311/mseek-asr-v1"

folder = Path(snapshot_download(
    repo_id=REPO,
    repo_type="model",
    max_workers=1
))

print("=" * 60)
print("C03 TOKENIZER INSPECTION")
print("=" * 60)

# Read vocabulary
vocab_path = folder / "vocab.json"

with open(vocab_path, "r", encoding="utf-8") as f:
    vocab = json.load(f)

print("\n[1] VOCABULARY FILE")

print("Total entries:", len(vocab))

for token, token_id in sorted(
    vocab.items(), key=lambda x: x[1]
):
    print(f"{token!r:20} -> {token_id}")

# Read tokenizer config
print("\n[2] TOKENIZER CONFIG")

config_path = folder / "tokenizer_config.json"

with open(config_path, "r", encoding="utf-8") as f:
    config = json.load(f)

for key in [
    "bos_token",
    "eos_token",
    "unk_token",
    "pad_token",
    "word_delimiter_token",
]:
    print(key, ":", config.get(key))

# Read model config
print("\n[3] MODEL CONFIG")

model_config_path = folder / "config.json"

with open(model_config_path, "r", encoding="utf-8") as f:
    model_config = json.load(f)

print("vocab_size:", model_config.get("vocab_size"))
print("pad_token_id:", model_config.get("pad_token_id"))
print("bos_token_id:", model_config.get("bos_token_id"))
print("eos_token_id:", model_config.get("eos_token_id"))

print("\n" + "=" * 60)
print("INSPECTION COMPLETE")
print("=" * 60)

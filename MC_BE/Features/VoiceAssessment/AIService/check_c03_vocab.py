
import os
from pathlib import Path

from dotenv import load_dotenv
from huggingface_hub import snapshot_download
from transformers import AutoProcessor, AutoModelForCTC

load_dotenv()

REPO = "nozero23061311/mseek-asr-v1"
TOKEN = os.getenv("HF_TOKEN") or None

print("=" * 60)
print("C03 VOCABULARY DIAGNOSTIC")
print("=" * 60)

# ==========================================
# 1. FIND LOCAL CACHE
# ==========================================

print("\n[1] DOWNLOAD / CACHE")

folder = snapshot_download(
    repo_id=REPO,
    repo_type="model",
    token=TOKEN,
    max_workers=1
)

folder = Path(folder)

print("Local folder:", folder)
print("CACHE: PASS")

# ==========================================
# 2. LOAD PROCESSOR
# ==========================================

print("\n[2] PROCESSOR")

processor = AutoProcessor.from_pretrained(
    str(folder),
    local_files_only=True
)

tokenizer = processor.tokenizer

print("Tokenizer class:", type(tokenizer).__name__)
print("Tokenizer length:", len(tokenizer))
print("Vocab size:", tokenizer.vocab_size)
print("Special tokens:", tokenizer.all_special_tokens)
print("Special token IDs:", tokenizer.all_special_ids)

# ==========================================
# 3. LOAD MODEL
# ==========================================

print("\n[3] MODEL")

model = AutoModelForCTC.from_pretrained(
    str(folder),
    local_files_only=True
)

print("Model class:", type(model).__name__)
print("Config vocab size:", model.config.vocab_size)
print("LM head output:", model.lm_head.out_features)

# ==========================================
# 4. COMPARE VOCABULARY
# ==========================================

print("\n[4] VOCABULARY COMPARISON")

tokenizer_vocab = tokenizer.get_vocab()
max_token_id = max(tokenizer_vocab.values())

print("Tokenizer length:", len(tokenizer))
print("Tokenizer vocab size:", tokenizer.vocab_size)
print("Maximum token ID:", max_token_id)
print("Model output dimension:", model.config.vocab_size)

print(
    "Tokenizer IDs in model range:",
    max_token_id < model.config.vocab_size
)

print(
    "Model and LM head match:",
    model.config.vocab_size == model.lm_head.out_features
)

# ==========================================
# 5. FINAL
# ==========================================

assert model.config.vocab_size == model.lm_head.out_features
assert max_token_id < model.config.vocab_size

print("\n" + "=" * 60)
print("C03 VOCABULARY DIAGNOSTIC COMPLETED")
print("=" * 60)

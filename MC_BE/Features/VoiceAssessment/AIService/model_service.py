import hashlib
import os
from pathlib import Path

import torch
from huggingface_hub import hf_hub_download
from transformers import AutoFeatureExtractor, AutoConfig, Wav2Vec2ForSequenceClassification

LABELS = ["PRON_INITIAL", "PRON_VOWEL", "PRON_FINAL", "PRON_TONE"]
BASE_MODEL_ID = os.getenv("BASE_MODEL_ID", "facebook/wav2vec2-xls-r-300m")
CHECKPOINT_REPO = os.getenv(
    "CHECKPOINT_REPO",
    "nozero23061311/mseek-pronunciation-v4-b",
)
CHECKPOINT_FILENAME = os.getenv("CHECKPOINT_FILENAME", "best_checkpoint.pt")
EXPECTED_SHA256 = os.getenv(
    "CHECKPOINT_SHA256",
    "7878654f1c49e5d4ed87299e9b0960a41cb1c8082f4cbdddbc463e9a1ce89a97",
)
SAMPLE_RATE = 16000
PROJECTOR_SIZE = 256
HF_REVISION = os.getenv(
    "HF_REVISION",
    "0cfed512fb7608a432a55f98cd3823f2d63ee038",
)

class V4BModelService:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.feature_extractor = None
        self.checkpoint_epoch = None
        self.checkpoint_sha256 = None
        self.is_loaded = False

    def load(self):
        token = os.getenv("HF_TOKEN") or None

        checkpoint_path = hf_hub_download(
    repo_id=CHECKPOINT_REPO,
    filename=CHECKPOINT_FILENAME,
    repo_type="model",
    revision=HF_REVISION,
    token=token,
)

        digest = self._sha256(checkpoint_path)
        if EXPECTED_SHA256 and digest.lower() != EXPECTED_SHA256.lower():
            raise RuntimeError(
                f"SHA256 checkpoint không khớp. Expected={EXPECTED_SHA256}, actual={digest}"
            )

        # The uploaded checkpoint contains the complete fine-tuned state dict.
        # Instantiate the exact Transformers task architecture, then restore strictly.
        config = AutoConfig.from_pretrained(BASE_MODEL_ID, token=token)
        config.num_labels = len(LABELS)
        config.classifier_proj_size = PROJECTOR_SIZE
        config.problem_type = "multi_label_classification"
        config.id2label = {i: label for i, label in enumerate(LABELS)}
        config.label2id = {label: i for i, label in enumerate(LABELS)}

        model = Wav2Vec2ForSequenceClassification(config)
        checkpoint = torch.load(
            checkpoint_path,
            map_location="cpu",
            weights_only=False,
        )

        if checkpoint.get("experiment") != "V4-B":
            raise RuntimeError(
                f"Checkpoint không phải V4-B: {checkpoint.get('experiment')}"
            )

        state_dict = checkpoint.get("model")
        if not isinstance(state_dict, dict):
            raise RuntimeError("Checkpoint không chứa model state dict hợp lệ.")

        model.load_state_dict(state_dict, strict=True)
        model.to(self.device)
        model.eval()

        self.feature_extractor = AutoFeatureExtractor.from_pretrained(
            BASE_MODEL_ID,
            token=token,
        )
        if self.feature_extractor.sampling_rate != SAMPLE_RATE:
            raise RuntimeError(
                f"Sampling rate không đúng: {self.feature_extractor.sampling_rate}"
            )

        self.model = model
        self.checkpoint_epoch = int(checkpoint.get("epoch", 0))
        self.checkpoint_sha256 = digest
        self.is_loaded = True

    @staticmethod
    def _sha256(path: str, chunk_size: int = 8 * 1024 * 1024) -> str:
        sha = hashlib.sha256()
        with open(path, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                sha.update(chunk)
        return sha.hexdigest()

    @torch.inference_mode()
    def predict(self, audio):
        if not self.is_loaded:
            raise RuntimeError("Model chưa được nạp.")

        encoded = self.feature_extractor(
            audio,
            sampling_rate=SAMPLE_RATE,
            return_tensors="pt",
            padding=True,
            return_attention_mask=True,
        )

        input_values = encoded["input_values"].to(self.device)
        attention_mask = encoded.get("attention_mask")
        if attention_mask is not None:
            attention_mask = attention_mask.to(self.device)

        outputs = self.model(
            input_values=input_values,
            attention_mask=attention_mask,
        )
        probabilities = torch.sigmoid(outputs.logits)[0].float().cpu().tolist()

        return {
            label: round(float(probability), 8)
            for label, probability in zip(LABELS, probabilities)
        }

    def get_info(self):
        return {
            "model_version": "V4-B",
            "base_model": BASE_MODEL_ID,
            "checkpoint_repository": CHECKPOINT_REPO,
            "checkpoint_filename": CHECKPOINT_FILENAME,
            "checkpoint_epoch": self.checkpoint_epoch,
            "checkpoint_sha256": self.checkpoint_sha256,
            "labels": LABELS,
            "sample_rate": SAMPLE_RATE,
            "projector_size": PROJECTOR_SIZE,
            "device": str(self.device),
            "loaded": self.is_loaded,
        }

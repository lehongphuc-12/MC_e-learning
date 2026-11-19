
import os
import json
import hashlib

from pathlib import Path
from huggingface_hub import snapshot_download
from pathlib import Path
import os
import torch
import joblib
import numpy as np

from transformers import AutoModel, AutoFeatureExtractor


class C02Service:
    REPO = "nozero23061311/mseek-clarity-v10"
    ENCODER = "nguyenvulebinh/wav2vec2-base-vietnamese-250h"

    SAMPLE_RATE = 16000
    EMBEDDING_DIMENSION = 1536

    def __init__(self):
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.encoder = None
        self.extractor = None
        self.pipeline = None
        self.metadata = None

        self.loaded = False

    @staticmethod
    def sha256(path):
        digest = hashlib.sha256()

        with open(path, "rb") as file:
            for chunk in iter(
                lambda: file.read(8 * 1024 * 1024),
                b""
            ):
                digest.update(chunk)

        return digest.hexdigest()

    def load(self):
        if self.loaded:
            return

        token = os.getenv("HF_TOKEN") or None

        folder = Path(
            snapshot_download(
        repo_id=self.REPO,
        repo_type="model",
        token=token,
        max_workers=2,
        resume_download=True
            )
        )

        metadata_path = folder / "metadata.json"
        model_path = folder / "c02_v10_model.joblib"

        if not metadata_path.is_file():
            raise RuntimeError("Missing C02 metadata.json")

        if not model_path.is_file():
            raise RuntimeError("Missing C02 model.joblib")

        metadata = json.loads(
            metadata_path.read_text(encoding="utf-8")
        )

        if metadata.get("embedding_dimension") != 1536:
            raise RuntimeError(
                "C02 embedding dimension mismatch"
            )

        if metadata.get("model_type") != "StandardScaler + Ridge":
            raise RuntimeError("Invalid C02 model type")

        encoder_config = metadata.get("encoder", {})

        if encoder_config.get("exact_checkpoint") != self.ENCODER:
            raise RuntimeError("C02 encoder checkpoint mismatch")

        if encoder_config.get("pooling") != "mean_std":
            raise RuntimeError("C02 pooling mismatch")

        if encoder_config.get("sample_rate") != self.SAMPLE_RATE:
            raise RuntimeError("C02 sample rate mismatch")

        expected_hash = metadata.get("model_sha256")

        if expected_hash:
            actual_hash = self.sha256(model_path)

            if actual_hash.lower() != expected_hash.lower():
                raise RuntimeError(
                    "C02 model SHA256 mismatch"
                )

        extractor = AutoFeatureExtractor.from_pretrained(
            self.ENCODER,
            token=token
        )

        encoder = AutoModel.from_pretrained(
            self.ENCODER,
            token=token
        )

        encoder = encoder.to(self.device).eval()

        # Only load a trusted, self-produced joblib artifact.
        pipeline = joblib.load(model_path)

        if not hasattr(pipeline, "predict"):
            raise RuntimeError("Invalid C02 pipeline")

        if getattr(pipeline, "n_features_in_", 1536) != 1536:
            raise RuntimeError(
                "C02 pipeline input dimension mismatch"
            )

        self.metadata = metadata
        self.extractor = extractor
        self.encoder = encoder
        self.pipeline = pipeline

        self.loaded = True

    @torch.inference_mode()
    def predict(self, audio):
        if not self.loaded:
            raise RuntimeError("C02 not loaded")

        inputs = self.extractor(
            np.asarray(audio, dtype=np.float32),
            sampling_rate=self.SAMPLE_RATE,
            return_tensors="pt"
        )

        outputs = self.encoder(
            input_values=inputs.input_values.to(self.device)
        )

        hidden = outputs.last_hidden_state.float()

        mean = hidden.mean(dim=1)
        std = hidden.std(dim=1, unbiased=False)

        embedding = torch.cat(
            [mean, std],
            dim=-1
        ).cpu().numpy()

        if embedding.shape != (1, self.EMBEDDING_DIMENSION):
            raise RuntimeError(
                f"Invalid C02 embedding shape: {embedding.shape}"
            )

        raw_score = float(
            self.pipeline.predict(embedding)[0]
        )

        if not np.isfinite(raw_score):
            raise RuntimeError("C02 predicted score is not finite")

        return {
            "model_version": self.metadata.get(
                "model_version", "C02-V10"
            ),
            "criterion": "Speech Clarity",
            "score": round(
                float(np.clip(raw_score, 1.0, 5.0)),
                4
            ),
            "raw_score": round(raw_score, 4),
            "score_scale": [1, 5],
            "deployment_mode": "beta_reference_only",
            "automatic_pass_fail": False
        }

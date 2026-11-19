
import os
import time

import torch
import numpy as np

from huggingface_hub import hf_hub_download

from transformers import (
    AutoProcessor,
    AutoModelForCTC,
    Wav2Vec2CTCTokenizer,
    Wav2Vec2Processor,
)


class C03Service:
    REPO = "nozero23061311/mseek-asr-v1"

    SAMPLE_RATE = 16000
    EXPECTED_VOCAB_SIZE = 110

    EXPECTED_UNK_ID = 108
    EXPECTED_PAD_ID = 109

    def __init__(self):
        self.device = torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

        self.processor = None
        self.model = None
        self.loaded = False

    def load(self):
        if self.loaded:
            return

        token = os.getenv("HF_TOKEN") or None

        # =====================================
        # 1. LOAD ORIGINAL PROCESSOR
        # =====================================

        base_processor = AutoProcessor.from_pretrained(
            self.REPO,
            token=token
        )

        feature_extractor = base_processor.feature_extractor

        if feature_extractor.sampling_rate != self.SAMPLE_RATE:
            raise RuntimeError(
                "C03 sample rate mismatch"
            )

        # =====================================
        # 2. LOAD ORIGINAL VOCABULARY
        # =====================================

        vocab_path = hf_hub_download(
            repo_id=self.REPO,
            filename="vocab.json",
            token=token
        )

        # Reconstruct tokenizer using ONLY original
        # 110-token vocabulary.
        tokenizer = Wav2Vec2CTCTokenizer(
            vocab_file=vocab_path,
            unk_token="<unk>",
            pad_token="<pad>",
            word_delimiter_token="|",
            bos_token=None,
            eos_token=None,
            do_lower_case=False
        )

        # Build processor with original feature extractor
        # and reconstructed CTC tokenizer.
        processor = Wav2Vec2Processor(
            feature_extractor=feature_extractor,
            tokenizer=tokenizer
        )

        # =====================================
        # 3. LOAD FINE-TUNED MODEL
        # =====================================

        model = AutoModelForCTC.from_pretrained(
            self.REPO,
            token=token
        )

        # =====================================
        # 4. VALIDATE MODEL VOCABULARY
        # =====================================

        model_vocab_size = model.config.vocab_size

        if model_vocab_size != self.EXPECTED_VOCAB_SIZE:
            raise RuntimeError(
                f"C03 model vocabulary mismatch: "
                f"{model_vocab_size}"
            )

        # =====================================
        # 5. VALIDATE TOKENIZER VOCABULARY
        # =====================================

        tokenizer_vocab = tokenizer.get_vocab()

        tokenizer_length = len(tokenizer)

        if tokenizer_length != self.EXPECTED_VOCAB_SIZE:
            raise RuntimeError(
                f"C03 tokenizer length mismatch: "
                f"{tokenizer_length}"
            )

        if tokenizer_vocab.get("<unk>") != self.EXPECTED_UNK_ID:
            raise RuntimeError(
                "C03 UNK token ID mismatch"
            )

        if tokenizer_vocab.get("<pad>") != self.EXPECTED_PAD_ID:
            raise RuntimeError(
                "C03 PAD token ID mismatch"
            )

        max_token_id = max(tokenizer_vocab.values())

        if max_token_id >= model_vocab_size:
            raise RuntimeError(
                "C03 tokenizer IDs exceed model output range"
            )

        if min(tokenizer_vocab.values()) != 0:
            raise RuntimeError(
                "C03 vocabulary must start at ID 0"
            )

        if len(set(tokenizer_vocab.values())) != self.EXPECTED_VOCAB_SIZE:
            raise RuntimeError(
                "C03 vocabulary contains duplicate token IDs"
            )

        # =====================================
        # 6. VALIDATE MODEL OUTPUT
        # =====================================

        if model.lm_head.out_features != self.EXPECTED_VOCAB_SIZE:
            raise RuntimeError(
                "C03 LM head dimension mismatch"
            )

        # =====================================
        # 7. FINALIZE
        # =====================================

        model = model.to(self.device)
        model.eval()

        self.processor = processor
        self.model = model
        self.loaded = True

        print("=" * 50)
        print("C03 MODEL LOADED SUCCESSFULLY")
        print("Device:", self.device)
        print("Tokenizer length:", tokenizer_length)
        print("Model vocab size:", model_vocab_size)
        print("Maximum token ID:", max_token_id)
        print("UNK ID:", tokenizer_vocab["<unk>"])
        print("PAD ID:", tokenizer_vocab["<pad>"])
        print("=" * 50)

    @torch.inference_mode()
    def transcribe(self, audio):
        if not self.loaded:
            raise RuntimeError("C03 not loaded")

        started = time.perf_counter()

        audio = np.asarray(
            audio,
            dtype=np.float32
        )

        if audio.ndim != 1 or audio.size == 0:
            raise ValueError(
                "C03 requires non-empty mono audio"
            )

        if not np.isfinite(audio).all():
            raise ValueError(
                "C03 audio contains invalid values"
            )

        inputs = self.processor(
            audio,
            sampling_rate=self.SAMPLE_RATE,
            return_tensors="pt",
            padding=True
        )

        input_values = inputs.input_values.to(
            self.device
        )

        model_inputs = {
            "input_values": input_values
        }

        attention_mask = inputs.get("attention_mask")

        if (
            attention_mask is not None
            and getattr(
                self.model.config,
                "feat_extract_norm",
                None
            ) == "layer"
        ):
            model_inputs["attention_mask"] = (
                attention_mask.to(self.device)
            )

        outputs = self.model(**model_inputs)

        logits = outputs.logits

        if logits.ndim != 3:
            raise RuntimeError(
                "Invalid C03 logits shape"
            )

        if logits.shape[-1] != self.EXPECTED_VOCAB_SIZE:
            raise RuntimeError(
                "C03 output vocabulary mismatch"
            )

        if not torch.isfinite(logits).all():
            raise RuntimeError(
                "C03 logits contain invalid values"
            )

        predicted_ids = torch.argmax(
            logits,
            dim=-1
        )

        transcript = self.processor.batch_decode(
            predicted_ids
        )[0].strip()

        inference_time_ms = round(
            (time.perf_counter() - started) * 1000,
            2
        )

        return {
            "model_version": "C03-Finetuned-V1",
            "transcript": transcript,
            "sample_rate": self.SAMPLE_RATE,
            "inference_time_ms": inference_time_ms
        }

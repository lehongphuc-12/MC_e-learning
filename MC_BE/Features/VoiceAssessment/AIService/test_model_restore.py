
import torch

from model_service import (
    V4BModelService,
    EXPECTED_SHA256,
    LABELS,
    PROJECTOR_SIZE,
    SAMPLE_RATE,
)

print("=" * 60)
print("STEP 3.7 — V4-B MODEL RESTORATION TEST")
print("=" * 60)

service = V4BModelService()

print("\n[1] LOADING MODEL")

service.load()

assert service.is_loaded
assert service.model is not None
assert service.feature_extractor is not None

print("MODEL: PASS")
print("DEVICE:", service.device)

print("\n[2] CHECKPOINT")

info = service.get_info()

print("Version:", info["model_version"])
print("Epoch:", service.checkpoint_epoch)
print("SHA256:", service.checkpoint_sha256)

assert info["model_version"] == "V4-B"
assert service.checkpoint_epoch == 3
assert service.checkpoint_sha256 is not None

assert (
    service.checkpoint_sha256.lower()
    == EXPECTED_SHA256.lower()
)

print("CHECKPOINT: PASS")

print("\n[3] ARCHITECTURE")

model = service.model

print("Class:", type(model).__name__)

total_parameters = sum(
    p.numel() for p in model.parameters()
)

trainable_parameters = sum(
    p.numel()
    for p in model.parameters()
    if p.requires_grad
)

print("Parameters:", total_parameters)
print("Trainable:", trainable_parameters)

assert (
    type(model).__name__
    == "Wav2Vec2ForSequenceClassification"
)

print("Projector:", tuple(model.projector.weight.shape))
print("Classifier:", tuple(model.classifier.weight.shape))

assert tuple(
    model.projector.weight.shape
) == (PROJECTOR_SIZE, 1024)

assert tuple(
    model.classifier.weight.shape
) == (len(LABELS), PROJECTOR_SIZE)

assert model.config.num_labels == len(LABELS)
assert model.config.classifier_proj_size == PROJECTOR_SIZE

print("ARCHITECTURE: PASS")

print("\n[4] PROCESSOR")

print(
    "Class:",
    type(service.feature_extractor).__name__
)

print(
    "Sampling rate:",
    service.feature_extractor.sampling_rate
)

assert (
    service.feature_extractor.sampling_rate
    == SAMPLE_RATE
)

print("PROCESSOR: PASS")

print("\n[5] LABEL CONTRACT")

print(info["labels"])

assert info["labels"] == LABELS
assert len(info["labels"]) == 4

print("LABELS: PASS")

print("\n[6] MODEL MODE")

assert not model.training

assert all(
    parameter.device == service.device
    for parameter in model.parameters()
)

assert all(
    not parameter.grad is not None
    for parameter in model.parameters()
)

print("EVAL MODE: PASS")
print("DEVICE CONSISTENCY: PASS")
print("NO EXISTING GRADIENTS: PASS")

print("\n" + "=" * 60)
print("STEP 3.7 COMPLETE")
print("MODEL RESTORATION: PASS")
print("CHECKPOINT INTEGRITY: PASS")
print("TRAINING: NO")
print("WEIGHT MODIFICATION: NO")
print("INFERENCE: NOT YET")
print("=" * 60)

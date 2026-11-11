
import torch

from model_service import V4BModelService

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

print("Version:", service.get_info()["model_version"])
print("Epoch:", service.checkpoint_epoch)
print("SHA256:", service.checkpoint_sha256)

assert service.checkpoint_sha256 is not None
assert service.checkpoint_epoch == 3

print("CHECKPOINT: PASS")

print("\n[3] ARCHITECTURE")

model = service.model

print("Class:", type(model).__name__)
print("Parameters:", sum(p.numel() for p in model.parameters()))
print("Trainable:", sum(
    p.numel() for p in model.parameters() if p.requires_grad
))

assert type(model).__name__ == "Wav2Vec2ForSequenceClassification"

print("Projector:", tuple(model.projector.weight.shape))
print("Classifier:", tuple(model.classifier.weight.shape))

assert tuple(model.projector.weight.shape) == (256, 1024)
assert tuple(model.classifier.weight.shape) == (4, 256)

print("ARCHITECTURE: PASS")

print("\n[4] PROCESSOR")

print("Class:", type(service.feature_extractor).__name__)
print("Sampling rate:", service.feature_extractor.sampling_rate)

assert service.feature_extractor.sampling_rate == 16000

print("PROCESSOR: PASS")

print("\n[5] LABEL CONTRACT")

print(service.get_info()["labels"])

assert len(service.get_info()["labels"]) == 4

print("LABELS: PASS")

print("\n[6] MODEL MODE")

assert not model.training

print("EVAL MODE: PASS")

print("\n" + "=" * 60)
print("STEP 3.7 COMPLETE")
print("MODEL RESTORATION: PASS")
print("TRAINING: NO")
print("WEIGHT MODIFICATION: NO")
print("INFERENCE: NOT YET")
print("=" * 60)

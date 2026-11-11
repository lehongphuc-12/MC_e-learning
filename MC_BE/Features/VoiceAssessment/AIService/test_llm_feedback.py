
import os
import json
import time
from openai import OpenAI

API_KEY = os.environ.get("STU_AI_API_KEY")

if not API_KEY:
    raise RuntimeError(
        "Chưa cấu hình biến môi trường STU_AI_API_KEY"
    )

client = OpenAI(
    base_url="https://aiportalapi.stu-platform.live/use",
    api_key=API_KEY,
    timeout=90.0
)

analysis = {
    "model_version": "V4-B",
    "checkpoint_epoch": 3,
    "sample_rate": 16000,
    "duration_seconds": 2.4518,
    "inference_time_ms": 784.69,
    "predictions": {
        "PRON_INITIAL": 0.44036186,
        "PRON_VOWEL": 0.02347072,
        "PRON_FINAL": 0.00605262,
        "PRON_TONE": 0.02151683
    }
}

system_prompt = """
Bạn là trợ lý MSEEK hướng dẫn luyện phát âm tiếng Việt.

Chỉ dựa trên dữ liệu được cung cấp.
Các giá trị sigmoid không phải điểm số phát âm
và không chứng minh chắc chắn học viên mắc lỗi.

Không tự tạo từ phát âm sai, timestamp hoặc
bằng chứng âm thanh không có trong dữ liệu.

Trả về duy nhất JSON hợp lệ, không có Markdown.

Cấu trúc bắt buộc:
{
  "overallAssessment": "string",
  "summary": "string",
  "strengths": [
    {
      "category": "string",
      "explanation": "string",
      "evidence": "string"
    }
  ],
  "issues": [
    {
      "category": "string",
      "explanation": "string",
      "evidence": "string"
    }
  ],
  "recommendations": ["string"],
  "practicePlan": [
    {
      "title": "string",
      "instruction": "string",
      "example": "string"
    }
  ],
  "encouragement": "string"
}
"""

user_prompt = json.dumps(
    {
        "feedback_mode": "HYBRID",
        "feedback_level": "DETAILED",
        "analysis": analysis,
        "expected_text": None,
        "transcript_text": None
    },
    ensure_ascii=False
)

print("=== MSEEK GPT-6-LUNA TEST ===")

start = time.perf_counter()

response = client.responses.create(
    model="GPT-6-Luna",
    instructions=system_prompt,
    input=user_prompt
)

elapsed = time.perf_counter() - start

output = response.output_text.strip()

if output.startswith("```"):
    lines = output.splitlines()
    if lines and lines[0].startswith("```"):
        lines.pop(0)
    if lines and lines[-1].strip() == "```":
        lines.pop()
    output = "\n".join(lines).strip()

feedback = json.loads(output)

required = [
    "overallAssessment",
    "summary",
    "strengths",
    "issues",
    "recommendations",
    "practicePlan",
    "encouragement"
]

for field in required:
    if field not in feedback:
        raise ValueError(f"Thiếu trường: {field}")

for field in ("overallAssessment", "summary", "encouragement"):
    if not isinstance(feedback[field], str) or not feedback[field].strip():
        raise ValueError(f"Trường không hợp lệ: {field}")

for field in ("strengths", "issues", "recommendations", "practicePlan"):
    if not isinstance(feedback[field], list):
        raise ValueError(f"Trường không phải danh sách: {field}")

for field in ("strengths", "issues"):
    for item in feedback[field]:
        if not isinstance(item, dict) or any(
            not isinstance(item.get(k), str)
            for k in ("category", "explanation", "evidence")
        ):
            raise ValueError(f"Phần tử không hợp lệ: {field}")

for item in feedback["practicePlan"]:
    if not isinstance(item, dict) or any(
        not isinstance(item.get(k), str)
        for k in ("title", "instruction", "example")
    ):
        raise ValueError("Bài tập không hợp lệ")

if any(not isinstance(x, str) for x in feedback["recommendations"]):
    raise ValueError("Danh sách đề xuất không hợp lệ")

print("MODEL: GPT-6-Luna")
print(f"RESPONSE TIME: {elapsed:.2f}s")
print("JSON VALIDATION: PASS")
print()
print(json.dumps(feedback, ensure_ascii=False, indent=2))

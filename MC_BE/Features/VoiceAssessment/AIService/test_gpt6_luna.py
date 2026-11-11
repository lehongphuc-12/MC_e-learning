
from openai import OpenAI
import os
import time

API_KEY = "sk-F3PqHXQ11_CSuCjKcLnDAw"

client = OpenAI(
    base_url="https://aiportalapi.stu-platform.live/use",
    api_key=API_KEY,
    timeout=90
)

print("=" * 55)
print("MSEEK - GPT-6-LUNA CONNECTION TEST")
print("=" * 55)

try:
    print("\n[1] MODEL:", "GPT-6-Luna")
    print("[2] CONNECTING TO AI PORTAL...")

    started = time.perf_counter()

    response = client.responses.create(
        model="GPT-6-Luna",
        input=(
            "Bạn là AI Mentor của nền tảng MSEEK. "
            "Hãy trả lời hoàn toàn bằng tiếng Việt. "
            "Giới thiệu ngắn gọn vai trò của bạn trong "
            "việc hỗ trợ học viên luyện phát âm."
        )
    )

    elapsed = (time.perf_counter() - started) * 1000

    print("\n[3] RESPONSE:")
    print(response.output_text)

    print("\n[4] PERFORMANCE")
    print(f"Response time: {elapsed:.2f} ms")

    print("\n[5] RESULT: PASS")

except Exception as exc:
    print("\n[ERROR]", type(exc).__name__)
    print("DETAIL:", str(exc))
    print("\nRESULT: FAIL")

print("=" * 55)

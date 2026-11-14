import logging
import threading
from typing import List, Tuple
from google import genai
from app.core.config import settings

logger = logging.getLogger("mentorchat.gemini_pool")


class GeminiClientPool:
    def __init__(self, api_keys: List[str]):
        self._keys = [k.strip() for k in api_keys if k and k.strip()]
        self._clients: List[genai.Client] = []
        for k in self._keys:
            try:
                self._clients.append(genai.Client(api_key=k))
            except Exception as e:
                logger.error("[GeminiPool] Lỗi khởi tạo client cho key '...%s': %s", k[-6:], e)
        self._lock = threading.Lock()
        self._index = 0

        logger.info(
            "[GeminiPool] Đã nạp %d API Key Gemini (Hỗ trợ Round-Robin & Failover tự động).",
            len(self._clients),
        )

    @property
    def key_count(self) -> int:
        return len(self._clients)

    def get_round_robin_client(self) -> Tuple[genai.Client, str, int]:
        """Lấy client tiếp theo theo vòng tròn (Round-Robin) để san tải đều giữa các Key."""
        with self._lock:
            if not self._clients:
                raise ValueError(
                    "Không có GEMINI_API_KEY nào hợp lệ trong .env. Vui lòng cấu hình GEMINI_API_KEY hoặc GEMINI_API_KEY_2."
                )
            idx = self._index % len(self._clients)
            self._index = (self._index + 1) % len(self._clients)
            return self._clients[idx], self._keys[idx], idx + 1

    def get_ordered_clients_starting_from(self, start_client_idx: int) -> List[Tuple[genai.Client, str, int]]:
        """Trả về danh sách clients bắt đầu từ start_client_idx, theo sau là các clients dự phòng khác."""
        n = len(self._clients)
        if n == 0:
            return []
        ordered = []
        for offset in range(n):
            actual_idx = (start_client_idx - 1 + offset) % n
            ordered.append((self._clients[actual_idx], self._keys[actual_idx], actual_idx + 1))
        return ordered


gemini_pool = GeminiClientPool(settings.GEMINI_API_KEYS)

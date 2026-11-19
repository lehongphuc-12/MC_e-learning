import io
import logging
from typing import List, Dict, Any
from pypdf import PdfReader

logger = logging.getLogger("mentorchat.document_service")


def extract_pages_from_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Trích xuất danh sách các trang từ PDF kèm page_number (bắt đầu từ trang 1).
    Trả về: [{"page_number": 1, "text": "..."}, ...]
    """
    if not file_bytes:
        logger.warning("[DocumentService] extract_pages_from_pdf — file_bytes rỗng.")
        return []

    logger.info("[DocumentService] Đang trích xuất từng trang PDF (%d bytes)...", len(file_bytes))
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        total_pages = len(reader.pages)
        pages: List[Dict[str, Any]] = []
        empty_pages = 0

        for page_num, page in enumerate(reader.pages, start=1):
            try:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    pages.append({
                        "page_number": page_num,
                        "text": page_text.strip(),
                    })
                else:
                    empty_pages += 1
                    logger.debug(
                        "[DocumentService] Trang %d/%d không có văn bản (ảnh scan?).",
                        page_num, total_pages,
                    )
            except Exception as page_err:
                empty_pages += 1
                logger.warning(
                    "[DocumentService] Lỗi trích xuất trang %d/%d: %s",
                    page_num, total_pages, page_err,
                )

        logger.info(
            "[DocumentService] PDF trích xuất xong: %d/%d trang có văn bản, %d trang trống/lỗi.",
            len(pages), total_pages, empty_pages,
        )
        return pages
    except Exception as e:
        logger.error(
            "[DocumentService] LỖI khi đọc PDF (%d bytes): %s",
            len(file_bytes), e, exc_info=True,
        )
        raise ValueError(f"Không thể đọc file PDF: {e}") from e


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Trích xuất toàn bộ nội dung văn bản từ tệp PDF tải lên (ghép các trang)."""
    pages = extract_pages_from_pdf(file_bytes)
    return "\n\n".join(p["text"] for p in pages)


def extract_text_from_txt(file_bytes: bytes) -> str:
    """Đọc tệp văn bản thô UTF-8."""
    if not file_bytes:
        logger.warning("[DocumentService] extract_text_from_txt — file_bytes rỗng.")
        return ""

    logger.info("[DocumentService] Đang đọc TXT/MD (%d bytes)...", len(file_bytes))
    try:
        text = file_bytes.decode("utf-8", errors="ignore")
        logger.info("[DocumentService] TXT/MD đọc xong: %d ký tự.", len(text))
        return text
    except Exception as e:
        logger.error("[DocumentService] LỖI khi decode TXT/MD: %s", e, exc_info=True)
        raise ValueError(f"Không thể đọc file văn bản: {e}") from e

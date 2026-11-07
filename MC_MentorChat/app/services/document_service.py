import io
import logging
from pypdf import PdfReader

logger = logging.getLogger("mentorchat.document_service")


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Trích xuất toàn bộ nội dung văn bản từ tệp PDF tải lên."""
    if not file_bytes:
        logger.warning("[DocumentService] extract_text_from_pdf — file_bytes rỗng.")
        return ""

    logger.info("[DocumentService] Đang trích xuất PDF (%d bytes)...", len(file_bytes))
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        total_pages = len(reader.pages)
        full_text = []
        empty_pages = 0

        for page_num, page in enumerate(reader.pages, start=1):
            try:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    full_text.append(page_text.strip())
                else:
                    empty_pages += 1
                    logger.debug(
                        "[DocumentService] Trang %d/%d không có văn bản (có thể là ảnh scan).",
                        page_num, total_pages,
                    )
            except Exception as page_err:
                empty_pages += 1
                logger.warning(
                    "[DocumentService] Lỗi trích xuất trang %d/%d: %s",
                    page_num, total_pages, page_err,
                )

        result = "\n\n".join(full_text)
        logger.info(
            "[DocumentService] PDF trích xuất xong: %d/%d trang có văn bản, %d trang trống/lỗi, tổng %d ký tự.",
            total_pages - empty_pages, total_pages, empty_pages, len(result),
        )
        if not result.strip():
            logger.warning(
                "[DocumentService] PDF (%d bytes) không chứa văn bản nào có thể trích xuất (PDF scan?).",
                len(file_bytes),
            )
        return result

    except Exception as e:
        logger.error(
            "[DocumentService] LỖI khi đọc PDF (%d bytes): %s",
            len(file_bytes), e, exc_info=True,
        )
        raise ValueError(f"Không thể đọc file PDF: {e}") from e


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

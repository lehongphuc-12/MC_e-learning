import re
import logging
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger("mentorchat.chunker")

# Danh sách phân cấp ký tự phân tách:
# 1. \n\n (đoạn văn)
# 2. \n (dòng văn bản)
# 3. . / ? / ! (kết thúc câu)
# 4. " " (khoảng trắng từ ngữ)
# 5. "" (ký tự đơn lẻ)
_SEPARATORS = ["\n\n", "\n", re.compile(r"(?<=[.?!])\s+"), " "]


@dataclass
class ChunkItem:
    content: str
    chunk_index: int
    page_number: Optional[int] = None


def _split_text_with_separator(text: str, separator: Any) -> List[str]:
    """Tách văn bản theo separator (chuỗi hoặc regex)."""
    if isinstance(separator, re.Pattern):
        parts = separator.split(text)
    elif separator:
        parts = text.split(separator)
    else:
        parts = list(text)
    return [p.strip() for p in parts if p and p.strip()]


def _recursive_split(
    text: str,
    chunk_size: int,
    chunk_overlap: int,
    sep_index: int = 0,
) -> List[str]:
    """
    Thuật toán Recursive Character Text Splitter:
    Tách phân cấp: \n\n -> \n -> . / ? / ! -> khoảng trắng.
    Giữ ngữ cảnh tiếng Việt nguyên vẹn, tránh cắt đứt giữa từ hoặc câu.
    """
    text = text.strip()
    if not text:
        return []

    if len(text) <= chunk_size:
        return [text]

    if sep_index >= len(_SEPARATORS):
        # Fallback: cắt theo ký tự nếu không còn separator nào khả dụng
        chunks = []
        start = 0
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= len(text):
                break
            start = end - chunk_overlap if end - chunk_overlap > start else end
        return chunks

    current_sep = _SEPARATORS[sep_index]
    splits = _split_text_with_separator(text, current_sep)

    # Nếu sau khi tách chỉ có 1 phần hoặc không chia nhỏ được, thử separator tiếp theo
    if len(splits) <= 1:
        return _recursive_split(text, chunk_size, chunk_overlap, sep_index + 1)

    # Gom các mảnh nhỏ lại thành từng chunk hợp lý
    chunks: List[str] = []
    current_piece = ""

    for piece in splits:
        # Nếu mảnh bản thân nó đã vượt quá chunk_size, gọi đệ quy phân tách sâu hơn
        if len(piece) > chunk_size:
            if current_piece:
                chunks.append(current_piece)
                current_piece = ""
            sub_chunks = _recursive_split(piece, chunk_size, chunk_overlap, sep_index + 1)
            chunks.extend(sub_chunks)
            continue

        joiner = "\n\n" if sep_index == 0 else ("\n" if sep_index == 1 else " ")
        tentative = f"{current_piece}{joiner}{piece}".strip() if current_piece else piece

        if len(tentative) <= chunk_size:
            current_piece = tentative
        else:
            if current_piece:
                chunks.append(current_piece)
                overlap_text = current_piece[-chunk_overlap:].strip() if len(current_piece) > chunk_overlap else ""
                current_piece = f"{overlap_text} {piece}".strip() if overlap_text else piece
            else:
                current_piece = piece

    if current_piece:
        chunks.append(current_piece)

    return chunks


def chunk_text(
    text: str,
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
) -> List[str]:
    """
    Tách văn bản dài thành các đoạn kèm overlap theo ngữ cảnh tiếng Việt.
    Mặc định chunk_size ~ 800–1200 ký tự (settings.CHUNK_SIZE), overlap 150–200 ký tự.
    """
    size = chunk_size or settings.CHUNK_SIZE
    overlap = chunk_overlap or settings.CHUNK_OVERLAP
    return _recursive_split(text, chunk_size=size, chunk_overlap=overlap)


def chunk_document_pages(
    pages: List[Dict[str, Any]],
    chunk_size: Optional[int] = None,
    chunk_overlap: Optional[int] = None,
) -> List[ChunkItem]:
    """
    Chia nhỏ danh sách trang PDF/Tài liệu, mỗi trang mang thông tin `page_number`.
    Đảm bảo mỗi chunk lưu kèm số trang nguồn gốc chính xác.
    """
    size = chunk_size or settings.CHUNK_SIZE
    overlap = chunk_overlap or settings.CHUNK_OVERLAP
    result_chunks: List[ChunkItem] = []
    chunk_counter = 0

    for page_info in pages:
        page_num = page_info.get("page_number")
        page_text = (page_info.get("text") or "").strip()
        if not page_text:
            continue

        page_splits = _recursive_split(page_text, chunk_size=size, chunk_overlap=overlap)
        for split in page_splits:
            result_chunks.append(
                ChunkItem(
                    content=split,
                    chunk_index=chunk_counter,
                    page_number=page_num,
                )
            )
            chunk_counter += 1

    return result_chunks

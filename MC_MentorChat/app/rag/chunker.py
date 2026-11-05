from typing import List

def chunk_text(
    text: str, 
    chunk_size: int = 500, 
    chunk_overlap: int = 80
) -> List[str]:
    """
    Chia văn bản dài (PDF hoặc Transcript) thành các đoạn ngắn hơn
    kèm vùng gối đầu (overlap) để giữ ngữ cảnh câu nói/đoạn văn.
    """
    if not text:
        return []

    paragraphs = text.split("\n\n")
    chunks: List[str] = []
    current_chunk = ""

    for para in paragraphs:
        cleaned = para.strip()
        if not cleaned:
            continue

        if len(current_chunk) + len(cleaned) + 2 <= chunk_size:
            current_chunk = f"{current_chunk}\n\n{cleaned}".strip()
        else:
            if current_chunk:
                chunks.append(current_chunk)
                overlap = current_chunk[-chunk_overlap:] if len(current_chunk) > chunk_overlap else ""
                current_chunk = f"{overlap}\n\n{cleaned}".strip()
            else:
                chunks.append(cleaned[:chunk_size])
                current_chunk = cleaned[chunk_size - chunk_overlap:]

    if current_chunk:
        chunks.append(current_chunk)

    return chunks
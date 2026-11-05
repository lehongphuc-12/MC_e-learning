import io
from pypdf import PdfReader

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Trích xuất toàn bộ nội dung văn bản từ tệp PDF tải lên."""
    reader = PdfReader(io.BytesIO(file_bytes))
    full_text = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            full_text.append(page_text.strip())
    return "\n\n".join(full_text)

def extract_text_from_txt(file_bytes: bytes) -> str:
    """Đọc tệp văn bản thô UTF-8."""
    return file_bytes.decode("utf-8", errors="ignore")
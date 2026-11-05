from typing import List
from google import genai
from app.core.config import settings

client = genai.Client(api_key=settings.GEMINI_API_KEY)

def generate_embedding(text: str) -> List[float]:
    """Tạo vector nhúng 768 chiều từ Gemini text-embedding-004."""
    response = client.models.embed_content(
        model=settings.EMBEDDING_MODEL,
        contents=text
    )
    return response.embeddings[0].values

def generate_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Tạo vector nhúng cho danh sách các chunks."""
    return [generate_embedding(t) for t in texts]
from typing import Optional
from app.rag.chunker import chunk_text
from app.rag.embeddings import generate_embeddings_batch
from app.rag.qdrant_service import upsert_chunks
from app.rag.retriever import retrieve_course_chunks
from app.services.gemini_service import generate_rag_answer
from app.models.schemas import ChatResponse, SourceItem

class RAGService:
    @staticmethod
    def ingest_video_transcript(course_id: int, lesson_id: int, lesson_title: str,
transcript_text: str) -> int:
        """Cắt đoạn và nạp script bài học vào Qdrant"""
        chunks = chunk_text(transcript_text, chunk_size=500, chunk_overlap=80)
        if not chunks:
            return 0

        vectors = generate_embeddings_batch(chunks)
        upsert_chunks(
            course_id=course_id,
            lesson_id=lesson_id,
            source_type="video_transcript",
            title=lesson_title,
            chunks=chunks,
            vectors=vectors
        )
        return len(chunks)

    @staticmethod
    def ingest_document(course_id: int, filename:str, content_text: str, lesson_id: Optional[int] = None) -> int:
        """Truy xuất nội dung khóa và gọi Gemini trả lời"""
        chunks = chunk_text(content_text, chunk_size=500, chunk_overlap=80)
        if not chunks:
            return 0

        vectors = generate_embeddings_batch(chunks)
        upsert_chunks(
            course_id=course_id,
            lesson_id=lesson_id,
            source_type="document",
            title=filename,
            chunks=chunks,
            vectors=vectors
        )
        return len(chunks)

    @staticmethod
    def anwer_question(course_id: int, question: str, lesson_id: Optional[int] = None, top_k: int = 4) -> ChatResponse:
        """Truy xuất nội dung trong khóa và gọi Gemini trả lời."""
        chunks = retrieve_course_chunks(course_id=course_id, query=question, 
lesson_id=lesson_id, top_k=top_k)
        answer = generate_rag_answer(query=question, context_chunks=chunks)

        sources = [
            SourceItem(
                source_type=c["source_type"],
                title=["title"],
                lesson_id=c.get("lesson_id"),
                snippet=c["content"][:160] + "...",
                score=c["score"]
            )
            for c in chunks
        ]

        return ChatResponse(
            answer=answer,
            course_id=course_id,
            sources=sources
        )

        
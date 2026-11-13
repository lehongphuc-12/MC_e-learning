import logging
from typing import Optional
from app.rag.chunker import chunk_text
from app.rag.embeddings import generate_embeddings_batch
from app.rag.qdrant_service import upsert_chunks
from app.rag.retriever import retrieve_course_chunks
from app.services.llm_service import generate_rag_answer
from app.models.schemas import ChatResponse, SourceItem

logger = logging.getLogger("mentorchat.rag_service")


class RAGService:

    @staticmethod
    def ingest_video_transcript(course_id: int, lesson_id: int, lesson_title: str, transcript_text: str) -> int:
        """Cắt đoạn và nạp transcript bài học vào Qdrant."""
        logger.info(
            "[RAGService/IngestTranscript] course_id=%s lesson_id=%s — bắt đầu chunking %d ký tự.",
            course_id, lesson_id, len(transcript_text),
        )

        chunks = chunk_text(transcript_text, chunk_size=500, chunk_overlap=80)
        if not chunks:
            logger.warning(
                "[RAGService/IngestTranscript] course_id=%s lesson_id=%s — không có chunk nào được tạo ra (transcript quá ngắn?).",
                course_id, lesson_id,
            )
            return 0

        logger.info(
            "[RAGService/IngestTranscript] course_id=%s lesson_id=%s — %d chunks, đang tạo embeddings...",
            course_id, lesson_id, len(chunks),
        )
        vectors = generate_embeddings_batch(chunks)

        logger.info(
            "[RAGService/IngestTranscript] course_id=%s lesson_id=%s — đang upsert %d vectors vào Qdrant...",
            course_id, lesson_id, len(vectors),
        )
        upsert_chunks(
            course_id=course_id,
            lesson_id=lesson_id,
            source_type="video_transcript",
            title=lesson_title,
            chunks=chunks,
            vectors=vectors
        )
        logger.info(
            "[RAGService/IngestTranscript] course_id=%s lesson_id=%s — HOÀN TẤT: %d chunks đã được lập chỉ mục.",
            course_id, lesson_id, len(chunks),
        )
        return len(chunks)

    @staticmethod
    def ingest_document(course_id: int, filename: str, content_text: str, lesson_id: Optional[int] = None) -> int:
        """Cắt đoạn và nạp tài liệu PDF/TXT vào Qdrant."""
        logger.info(
            "[RAGService/IngestDocument] course_id=%s lesson_id=%s file='%s' — bắt đầu chunking %d ký tự.",
            course_id, lesson_id, filename, len(content_text),
        )

        chunks = chunk_text(content_text, chunk_size=500, chunk_overlap=80)
        if not chunks:
            logger.warning(
                "[RAGService/IngestDocument] course_id=%s file='%s' — không có chunk nào được tạo ra (nội dung trống?).",
                course_id, filename,
            )
            return 0

        logger.info(
            "[RAGService/IngestDocument] course_id=%s file='%s' — %d chunks, đang tạo embeddings...",
            course_id, filename, len(chunks),
        )
        vectors = generate_embeddings_batch(chunks)

        logger.info(
            "[RAGService/IngestDocument] course_id=%s file='%s' — đang upsert %d vectors vào Qdrant...",
            course_id, filename, len(vectors),
        )
        upsert_chunks(
            course_id=course_id,
            lesson_id=lesson_id,
            source_type="document",
            title=filename,
            chunks=chunks,
            vectors=vectors
        )
        logger.info(
            "[RAGService/IngestDocument] course_id=%s file='%s' — HOÀN TẤT: %d chunks đã được lập chỉ mục.",
            course_id, filename, len(chunks),
        )
        return len(chunks)

    @staticmethod
    def answer_question(
        course_id: int,
        question: str,
        lesson_id: Optional[int] = None,
        top_k: int = 4,
        provider: Optional[str] = None,
    ) -> ChatResponse:
        """Truy xuất nội dung trong khóa và gọi LLM (aiportalapi/gemini/hybrid) trả lời."""
        logger.info(
            "[RAGService/AnswerQuestion] course_id=%s lesson_id=%s top_k=%s provider=%s — đang truy xuất chunks liên quan...",
            course_id, lesson_id, top_k, provider,
        )

        try:
            chunks = retrieve_course_chunks(
                course_id=course_id,
                query=question,
                lesson_id=lesson_id,
                top_k=top_k
            )
        except Exception as e:
            logger.error(
                "[RAGService/AnswerQuestion] course_id=%s — LỖI truy xuất từ Qdrant: %s",
                course_id, e, exc_info=True,
            )
            raise

        if not chunks:
            logger.warning(
                "[RAGService/AnswerQuestion] course_id=%s lesson_id=%s — Qdrant trả về 0 chunk, có thể chưa lập chỉ mục hoặc câu hỏi không liên quan.",
                course_id, lesson_id,
            )
        else:
            logger.info(
                "[RAGService/AnswerQuestion] course_id=%s — tìm thấy %d chunks, top score=%.3f. Đang gọi LLM provider='%s'...",
                course_id, len(chunks), chunks[0].get("score", 0.0), provider,
            )

        try:
            answer = generate_rag_answer(query=question, context_chunks=chunks, provider=provider)
        except Exception as e:
            logger.error(
                "[RAGService/AnswerQuestion] course_id=%s — LỖI gọi LLM để tạo câu trả lời: %s",
                course_id, e, exc_info=True,
            )
            raise

        sources = [
            SourceItem(
                source_type=c.get("source_type", "document"),
                title=c.get("title", ""),
                lesson_id=c.get("lesson_id"),
                snippet=c["content"][:160] + "...",
                score=c.get("score", 0.0)
            )
            for c in chunks
        ]

        logger.info(
            "[RAGService/AnswerQuestion] course_id=%s — câu trả lời tạo thành công, %d nguồn trích dẫn.",
            course_id, len(sources),
        )
        return ChatResponse(
            answer=answer,
            course_id=course_id,
            sources=sources
        )

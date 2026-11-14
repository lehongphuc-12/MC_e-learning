import logging
from typing import Optional, List, Dict, Any, Union
from app.rag.chunker import (
    chunk_text, 
    chunk_document_pages, 
    ChunkItem
)
from app.rag.embeddings import generate_embeddings_batch
from app.rag.qdrant_service import upsert_chunks
from app.rag.retriever import retrieve_course_chunks
from app.services.llm_service import generate_rag_answer
from app.models.schemas import ChatResponse, SourceItem

logger = logging.getLogger("mentorchat.rag_service")


class RAGService:

    @staticmethod
    def ingest_video_transcript(
        course_id: int, 
        lesson_id: int, 
        lesson_title: str, 
        transcript_text: str
    ) -> int:
        """
        Cắt đoạn và nạp transcript bài học vào Qdrant bằng Recursive Splitter tiếng Việt.
        """
        logger.info(
            "[RAGService/IngestTranscript] course_id=%s lesson_id=%s — chuẩn bị xử lý transcript %d ký tự...",
            course_id, lesson_id, len(transcript_text) if transcript_text else 0,
        )

        if not transcript_text or not transcript_text.strip():
            logger.warning("[RAGService/IngestTranscript] course_id=%s lesson_id=%s — Transcript rỗng.", course_id, lesson_id)
            return 0

        chunks = chunk_text(transcript_text)
        if not chunks:
            logger.warning(
                "[RAGService/IngestTranscript] course_id=%s lesson_id=%s — không có chunk nào được tạo ra.",
                course_id, lesson_id,
            )
            return 0

        logger.info(
            "[RAGService/IngestTranscript] course_id=%s lesson_id=%s — %d chunks, đang tạo embeddings (task_type=RETRIEVAL_DOCUMENT)...",
            course_id, lesson_id, len(chunks),
        )
        vectors = generate_embeddings_batch(chunks, task_type="RETRIEVAL_DOCUMENT")

        logger.info(
            "[RAGService/IngestTranscript] course_id=%s lesson_id=%s — đang upsert %d vectors vào Qdrant...",
            course_id, lesson_id, len(vectors),
        )
        total = upsert_chunks(
            course_id=course_id,
            lesson_id=lesson_id,
            source_type="video_transcript",
            title=lesson_title,
            chunks=chunks,
            vectors=vectors
        )
        logger.info(
            "[RAGService/IngestTranscript] course_id=%s lesson_id=%s — HOÀN TẤT: %d chunks đã được lập chỉ mục.",
            course_id, lesson_id, total,
        )
        return total

    @staticmethod
    def ingest_document(
        course_id: int, 
        filename: str, 
        pages: Optional[List[Dict[str, Any]]] = None,
        content_text: Optional[str] = None, 
        lesson_id: Optional[int] = None,
        material_id: Optional[int] = None,
    ) -> int:
        """
        Cắt đoạn và nạp tài liệu PDF/TXT/MD vào Qdrant:
        - Nếu có pages (từ PDF): lưu kèm page_number vào từng chunk.
        - Nếu là TXT/MD: tách recursive chunking thông minh.
        """
        logger.info(
            "[RAGService/IngestDocument] course_id=%s lesson_id=%s material_id=%s file='%s' — bắt đầu chunking...",
            course_id, lesson_id, material_id, filename,
        )

        chunk_items: List[Union[str, ChunkItem]] = []

        if pages and len(pages) > 0:
            logger.info("[RAGService/IngestDocument] Chia nhỏ %d trang PDF kèm page_number...", len(pages))
            chunk_items = chunk_document_pages(pages)
        elif content_text and content_text.strip():
            logger.info("[RAGService/IngestDocument] Chia nhỏ văn bản thô (%d ký tự)...", len(content_text))
            text_splits = chunk_text(content_text)
            chunk_items = [
                ChunkItem(content=c, chunk_index=i)
                for i, c in enumerate(text_splits)
            ]
        else:
            logger.warning("[RAGService/IngestDocument] course_id=%s file='%s' — Không có nội dung.", course_id, filename)
            return 0

        if not chunk_items:
            logger.warning(
                "[RAGService/IngestDocument] course_id=%s file='%s' — không có chunk nào được tạo ra.",
                course_id, filename,
            )
            return 0

        texts_to_embed = [
            item.content if isinstance(item, ChunkItem) else str(item)
            for item in chunk_items
        ]

        logger.info(
            "[RAGService/IngestDocument] course_id=%s file='%s' — %d chunks, đang tạo embeddings (task_type=RETRIEVAL_DOCUMENT)...",
            course_id, filename, len(chunk_items),
        )
        vectors = generate_embeddings_batch(texts_to_embed, task_type="RETRIEVAL_DOCUMENT")

        logger.info(
            "[RAGService/IngestDocument] course_id=%s file='%s' — đang upsert %d vectors vào Qdrant...",
            course_id, filename, len(vectors),
        )
        total = upsert_chunks(
            course_id=course_id,
            lesson_id=lesson_id,
            material_id=material_id,
            source_type="document",
            title=filename,
            chunks=chunk_items,
            vectors=vectors
        )
        logger.info(
            "[RAGService/IngestDocument] course_id=%s file='%s' — HOÀN TẤT: %d chunks đã được lập chỉ mục.",
            course_id, filename, total,
        )
        return total

    @staticmethod
    def answer_question(
        course_id: int,
        question: str,
        lesson_id: Optional[int] = None,
        top_k: int = 4,
        provider: Optional[str] = None,
    ) -> ChatResponse:
        """Truy xuất nội dung trong khóa và gọi LLM trả lời."""
        safe_top_k = max(1, min(12, top_k))

        logger.info(
            "[RAGService/AnswerQuestion] course_id=%s lesson_id=%s top_k=%s (requested=%s) provider=%s — đang truy xuất chunks...",
            course_id, lesson_id, safe_top_k, top_k, provider,
        )

        try:
            chunks = retrieve_course_chunks(
                course_id=course_id,
                query=question,
                lesson_id=lesson_id,
                top_k=safe_top_k
            )
        except Exception as e:
            logger.error(
                "[RAGService/AnswerQuestion] course_id=%s — LỖI truy xuất từ Qdrant: %s",
                course_id, e, exc_info=True,
            )
            raise

        if not chunks:
            logger.warning(
                "[RAGService/AnswerQuestion] course_id=%s lesson_id=%s — Qdrant trả về 0 chunk.",
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
                material_id=c.get("material_id"),
                page_number=c.get("page_number"),
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

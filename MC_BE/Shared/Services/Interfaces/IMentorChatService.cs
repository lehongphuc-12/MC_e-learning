using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Shared.Services.Interfaces;

public interface IMentorChatService
{
    Task<MentorChatResponseDto> AskQuestionAsync(int courseId, MentorChatRequestDto request, CancellationToken ct = default);

    Task<MentorIngestResponseDto?> IngestTranscriptAsync(
        int courseId, 
        int lessonId, 
        string lessonTitle, 
        string transcriptText, 
        CancellationToken ct = default);

    Task<MentorIngestResponseDto?> IngestDocumentAsync(
        int courseId, 
        string fileName, 
        Stream fileStream, 
        int? lessonId = null, 
        int? materialId = null,
        CancellationToken ct = default);

    Task<bool> DeleteKnowledgeAsync(
        int courseId, 
        int? lessonId = null, 
        int? materialId = null, 
        string? sourceType = null, 
        CancellationToken ct = default);
}

using MC_BE.Features.Courses.DTOs;

namespace MC_BE.Shared.Services.Interfaces;

public interface IMentorChatService
{
    Task<MentorChatResponseDto> AskQuestionAsync(int courseId, MentorChatRequestDto request, CancellationToken ct = default);
    Task<MentorIngestResponseDto?> IngestTranscriptAsync(int courseId, int lessonId, string lessonTitle, string transcriptText, CancellationToken ct = default);
    Task<MentorIngestResponseDto?> IngestDocumentAsync(int courseId, string fileName, Stream fileStream, int? lessonId = null, CancellationToken ct = default);
}

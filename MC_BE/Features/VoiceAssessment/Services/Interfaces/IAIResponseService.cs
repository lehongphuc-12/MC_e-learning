
using MC_BE.Features.VoiceAssessment.DTOs;

namespace MC_BE.Features.VoiceAssessment.Services.Interfaces;

public interface IAIResponseService
{
    Task<AIResponseResult> GenerateFeedbackAsync(
        int submissionId,
        int learnerId,
        AIResponseRequest request,
        CancellationToken cancellationToken = default);

    Task<AIResponseResult> GetLearnerFeedbackAsync(
        int submissionId,
        int learnerId,
        CancellationToken cancellationToken = default);

    Task<AIResponseResult> GetInstructorFeedbackAsync(
        int submissionId,
        int instructorId,
        CancellationToken cancellationToken = default);
}

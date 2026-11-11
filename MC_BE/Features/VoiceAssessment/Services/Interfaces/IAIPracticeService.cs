using MC_BE.Features.VoiceAssessment.DTOs;
namespace MC_BE.Features.VoiceAssessment.Services.Interfaces;
public interface IAIPracticeService
{
    Task<AIPracticeResult> AnalyzeAsync(int practiceSessionId, int learnerId,
        byte[] audio, string extension, CancellationToken ct);
    Task<AIPracticeResult> GetAsync(int practiceSessionId, CancellationToken ct);
}

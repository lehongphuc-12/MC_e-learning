
namespace MC_BE.Features.VoiceAssessment.Providers.Interfaces;

public interface ILLMProvider
{
    Task<string> GenerateAsync(
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken = default);
}

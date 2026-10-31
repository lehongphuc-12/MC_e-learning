namespace MC_BE.Features.Learning.Services.Interfaces;

public interface ILearningAccessService
{
    Task<(bool Allowed, string? Reason)> CheckLessonAsync(int learnerId, int lessonId);
    Task<(bool Allowed, string? Reason)> CheckQuizAsync(int learnerId, int quizId);
    Task<(bool Allowed, string? Reason)> CheckCertificateAsync(int learnerId, int courseId);
    Task<Dictionary<int, string?>> GetLessonLocksAsync(int learnerId, int courseId);
}

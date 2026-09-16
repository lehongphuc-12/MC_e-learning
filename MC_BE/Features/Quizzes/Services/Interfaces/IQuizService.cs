using MC_BE.Features.Quizzes.DTOs;

namespace MC_BE.Features.Quizzes.Services.Interfaces;

public interface IQuizService
{
    Task<QuizDto?> CreateQuizAsync(
        int instructorId,
        CreateQuizRequest request);

    Task<QuizDto?> GetQuizByIdAsync(int quizId);
    Task<QuizDto?> UpdateQuizAsync(
    int instructorId,
    int quizId,
    UpdateQuizRequest request);
}
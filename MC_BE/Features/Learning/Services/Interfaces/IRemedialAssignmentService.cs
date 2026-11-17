using MC_BE.Features.Learning.DTOs;

namespace MC_BE.Features.Learning.Services.Interfaces;

public interface IRemedialAssignmentService
{
    Task<List<RemedialAssignmentDto>> GetForInstructorAsync(int instructorId, int courseId);
    Task<List<RemedialAssignmentDto>> GetForLearnerAsync(int learnerId, int courseId);
    Task<RemedialAssignmentDto> CreateOrExtendAsync(int instructorId, int courseId, CreateRemedialAssignmentRequest request);
    Task<List<RemedialAssignmentEventDto>> GetHistoryAsync(int instructorId, int assignmentId);
    Task<bool> CanAccessContentAsync(int learnerId, string contentType, int contentId);
    Task<bool> CanStartAttemptAsync(int learnerId, string contentType, int contentId);
    Task RecordAttemptResultAsync(int learnerId, string contentType, int contentId, bool passed);
    Task CompleteSpeakingAttemptAsync(int learnerId, int scriptId, bool passed);
    Task CompleteLessonAsync(int learnerId, int lessonId);
    Task<bool> HasSpeakingRetakeGrantAsync(int learnerId, int scriptId);
    Task ConsumeSpeakingRetakeGrantAsync(int learnerId, int scriptId);
}

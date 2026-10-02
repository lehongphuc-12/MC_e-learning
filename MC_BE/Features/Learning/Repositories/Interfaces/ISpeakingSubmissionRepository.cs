using MC_BE.Core.Entities;
using MC_BE.Shared.Repositories.Interfaces;

namespace MC_BE.Features.Learning.Repositories.Interfaces;

public interface ISpeakingSubmissionRepository : IGenericRepository<SpeakingSubmission>
{
    Task<SpeakingSubmission?> GetByIdWithDetailsAsync(int submissionId);
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAsync(int learnerId);
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByInstructorAsync(int instructorId);
    Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByCourseAsync(int courseId);
    Task<SpeakingSubmission?> GetLatestByLearnerAndLessonAsync(int learnerId, int lessonId);
}

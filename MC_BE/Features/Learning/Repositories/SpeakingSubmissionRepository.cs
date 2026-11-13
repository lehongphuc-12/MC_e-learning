using MC_BE.Core.Entities;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Repositories;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Features.Learning.Repositories;

public class SpeakingSubmissionRepository : GenericRepository<SpeakingSubmission>, ISpeakingSubmissionRepository
{
    private readonly SmartMcDbContext _context;

    public SpeakingSubmissionRepository(SmartMcDbContext context) : base(context)
    {
        _context = context;
    }

    private IQueryable<SpeakingSubmission> IncludeSubmissionDetails()
    {
        return _context.SpeakingSubmissions
            .Include(s => s.SpeakingScript)
                .ThenInclude(sc => sc!.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.SpeakingScript)
                .ThenInclude(sc => sc!.Module)
            .Include(s => s.Lesson)
                .ThenInclude(l => l!.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.Lesson)
                .ThenInclude(l => l!.Module)
            .Include(s => s.Learner)
            .Include(s => s.GradedBy);
    }

    public async Task<SpeakingSubmission?> GetByIdWithDetailsAsync(int submissionId)
    {
        return await IncludeSubmissionDetails()
            .FirstOrDefaultAsync(s => s.SubmissionId == submissionId);
    }

    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAsync(int learnerId)
    {
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByInstructorAsync(int instructorId)
    {
        return await IncludeSubmissionDetails()
            .Where(s =>
                (s.Lesson != null && s.Lesson.Course != null && s.Lesson.Course.InstructorId == instructorId) ||
                (s.SpeakingScript != null && s.SpeakingScript.Course != null && s.SpeakingScript.Course.InstructorId == instructorId))
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByCourseAsync(int courseId)
    {
        return await IncludeSubmissionDetails()
            .Where(s =>
                (s.Lesson != null && s.Lesson.CourseId == courseId) ||
                (s.SpeakingScript != null && s.SpeakingScript.CourseId == courseId))
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    public async Task<SpeakingSubmission?> GetLatestByLearnerAndLessonAsync(int learnerId, int lessonId)
    {
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId && s.LessonId == lessonId)
            .OrderByDescending(s => s.SubmittedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<SpeakingSubmission?> GetLatestByLearnerAndScriptAsync(int learnerId, int scriptId)
    {
        return await IncludeSubmissionDetails()
            .Where(s => s.LearnerId == learnerId && (s.ScriptId == scriptId || (s.Lesson != null && s.Lesson.SpeakingScript != null && s.Lesson.SpeakingScript.ScriptId == scriptId)))
            .OrderByDescending(s => s.SubmittedAt)
            .FirstOrDefaultAsync();
    }
}

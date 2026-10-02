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

    public async Task<SpeakingSubmission?> GetByIdWithDetailsAsync(int submissionId)
    {
        return await _context.SpeakingSubmissions
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Module)
            .Include(s => s.Learner)
            .Include(s => s.GradedBy)
            .FirstOrDefaultAsync(s => s.SubmissionId == submissionId);
    }

    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByLearnerAsync(int learnerId)
    {
        return await _context.SpeakingSubmissions
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Module)
            .Include(s => s.Learner)
            .Include(s => s.GradedBy)
            .Where(s => s.LearnerId == learnerId)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByInstructorAsync(int instructorId)
    {
        return await _context.SpeakingSubmissions
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Module)
            .Include(s => s.Learner)
            .Include(s => s.GradedBy)
            .Where(s => s.Lesson.Course.InstructorId == instructorId)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<SpeakingSubmission>> GetSubmissionsByCourseAsync(int courseId)
    {
        return await _context.SpeakingSubmissions
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Module)
            .Include(s => s.Learner)
            .Include(s => s.GradedBy)
            .Where(s => s.Lesson.CourseId == courseId)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync();
    }

    public async Task<SpeakingSubmission?> GetLatestByLearnerAndLessonAsync(int learnerId, int lessonId)
    {
        return await _context.SpeakingSubmissions
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Course)
                    .ThenInclude(c => c.Instructor)
            .Include(s => s.Lesson)
                .ThenInclude(l => l.Module)
            .Include(s => s.Learner)
            .Include(s => s.GradedBy)
            .Where(s => s.LearnerId == learnerId && s.LessonId == lessonId)
            .OrderByDescending(s => s.SubmittedAt)
            .FirstOrDefaultAsync();
    }
}

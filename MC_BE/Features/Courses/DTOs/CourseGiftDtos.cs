namespace MC_BE.Features.Courses.DTOs;

public sealed class CourseGiftPolicyDto
{
    public int? GiftCourseId { get; set; }
    public string? GiftCourseTitle { get; set; }
    public bool IsActive { get; set; }
}

public sealed class CourseGiftCandidateDto
{
    public int CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string InstructorName { get; set; } = string.Empty;
}

public sealed class CourseGiftCandidatesPageDto
{
    public List<CourseGiftCandidateDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public sealed class UpdateCourseGiftPolicyRequest
{
    public int? GiftCourseId { get; set; }
    public bool IsActive { get; set; }
}

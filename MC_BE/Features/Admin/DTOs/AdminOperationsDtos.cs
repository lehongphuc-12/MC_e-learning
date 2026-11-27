namespace MC_BE.Features.Admin.DTOs;

public sealed class ActivityLogItemDto
{
    public long Id { get; set; }
    public DateTime OccurredAt { get; set; }
    public string Category { get; set; } = "SYSTEM";
    public string ActorName { get; set; } = "";
    public int? ActorUserId { get; set; }
    public string Action { get; set; } = "";
    public string EntityType { get; set; } = "";
    public string? EntityId { get; set; }
    public string Summary { get; set; } = "";
    public string Result { get; set; } = "";
}

public sealed class SupportRequestMessageDto
{
    public long Id { get; set; }
    public int SenderUserId { get; set; }
    public string SenderName { get; set; } = "";
    public string Body { get; set; } = "";
    public bool IsInternalNote { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class SupportRequestDto
{
    public long Id { get; set; }
    public string PublicCode { get; set; } = "";
    public int RequesterUserId { get; set; }
    public string RequesterName { get; set; } = "";
    public string RequesterEmail { get; set; } = "";
    public int? AssignedAdminId { get; set; }
    public string? AssignedAdminName { get; set; }
    public string Category { get; set; } = "";
    public string Subject { get; set; } = "";
    public string Description { get; set; } = "";
    public string Priority { get; set; } = "";
    public string Status { get; set; } = "";
    public string? ResolutionNote { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<SupportRequestMessageDto> Messages { get; set; } = new();
}

public sealed class CreateSupportRequestDto
{
    public string Category { get; set; } = "OTHER";
    public string Subject { get; set; } = "";
    public string Description { get; set; } = "";
    public string? Priority { get; set; }
    public int? RelatedCourseId { get; set; }
    public long? RelatedPaymentId { get; set; }
}

public sealed class SupportRequestReplyDto
{
    public string Body { get; set; } = "";
    public bool IsInternalNote { get; set; }
}

public sealed class SupportRequestUpdateDto
{
    public string Status { get; set; } = "";
    public string? ResolutionNote { get; set; }
    public int? AssignedAdminId { get; set; }
}

public sealed class PagedItemsDto<T>
{
    public List<T> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalItems { get; set; }
    public int TotalPages { get; set; }
}

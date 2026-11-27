using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("support_requests")]
public sealed class SupportRequest
{
    [Key] public long Id { get; set; }
    [Required, MaxLength(20)] public string PublicCode { get; set; } = string.Empty;
    public int RequesterUserId { get; set; }
    public int? AssignedAdminId { get; set; }
    public int? ResolvedByAdminId { get; set; }
    public int? RelatedCourseId { get; set; }
    public long? RelatedPaymentId { get; set; }
    [Required, MaxLength(40)] public string Category { get; set; } = "OTHER";
    [Required, MaxLength(160)] public string Subject { get; set; } = string.Empty;
    [Required, MaxLength(4000)] public string Description { get; set; } = string.Empty;
    [Required, MaxLength(20)] public string Priority { get; set; } = "NORMAL";
    [Required, MaxLength(24)] public string Status { get; set; } = "OPEN";
    [MaxLength(1000)] public string? ResolutionNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public User? Requester { get; set; }
    public User? AssignedAdmin { get; set; }
    public User? ResolvedByAdmin { get; set; }
    public ICollection<SupportRequestMessage> Messages { get; set; } = new List<SupportRequestMessage>();
}

[Table("support_request_messages")]
public sealed class SupportRequestMessage
{
    [Key] public long Id { get; set; }
    public long SupportRequestId { get; set; }
    public int SenderUserId { get; set; }
    [Required, MaxLength(4000)] public string Body { get; set; } = string.Empty;
    public bool IsInternalNote { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public SupportRequest? SupportRequest { get; set; }
    public User? Sender { get; set; }
}

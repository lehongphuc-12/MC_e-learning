using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("admin_activity_logs")]
public sealed class AdminActivityLog
{
    [Key] public long Id { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public int? ActorUserId { get; set; }
    [MaxLength(160)] public string ActorName { get; set; } = "System";
    [MaxLength(40)] public string Action { get; set; } = string.Empty;
    [MaxLength(60)] public string EntityType { get; set; } = string.Empty;
    [MaxLength(100)] public string? EntityId { get; set; }
    [MaxLength(300)] public string Summary { get; set; } = string.Empty;
    [MaxLength(20)] public string Result { get; set; } = "SUCCESS";
    [MaxLength(100)] public string? CorrelationId { get; set; }
    public int? RelatedUserId { get; set; }
    public User? Actor { get; set; }
}

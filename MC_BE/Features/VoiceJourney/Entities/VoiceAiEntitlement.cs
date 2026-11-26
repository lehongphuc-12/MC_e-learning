using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Features.VoiceJourney.Entities;

[Table("voice_ai_entitlements")]
public sealed class VoiceAiEntitlement
{
    [Key]
    public long Id { get; set; }

    public int LearnerId { get; set; }

    [MaxLength(30)]
    public string SourceType { get; set; } = "MC_GIFT"; // MC_GIFT | AI_PURCHASE | MANUAL

    public int? SourceCourseId { get; set; }
    public int? SourceEnrollmentId { get; set; }
    public int? SourcePaymentItemId { get; set; }
    public long? SourceGrantId { get; set; }

    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }

    [MaxLength(20)]
    public string Status { get; set; } = "ACTIVE"; // ACTIVE | EXPIRED | REVOKED

    public DateTime? RevokedAt { get; set; }

    [MaxLength(200)]
    public string? RevocationReason { get; set; }
}

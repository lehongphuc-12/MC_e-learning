using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("CERTIFICATE")]
public class Certificate
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("CertificateID")]
    public int CertificateId { get; set; }

    [Required]
    [Column("EnrollmentID")]
    public int EnrollmentId { get; set; }

    [Required]
    [MaxLength(60)]
    [Column("CertificateCode")]
    public string CertificateCode { get; set; } = string.Empty;

    [Column("IssuedAt")]
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    [Column("CompletionPercentage", TypeName = "numeric(5,2)")]
    public decimal CompletionPercentage { get; set; } = 100.00m;

    [MaxLength(20)]
    [Column("Grade")]
    public string? Grade { get; set; }

    [MaxLength(30)]
    [Column("Status")]
    public string Status { get; set; } = "ACTIVE";

    [MaxLength(500)]
    [Column("CertificateUrl")]
    public string? CertificateUrl { get; set; }

    // Navigation property
    [ForeignKey(nameof(EnrollmentId))]
    public virtual Enrollment Enrollment { get; set; } = null!;
}

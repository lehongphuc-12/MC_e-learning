using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Enums;

namespace MC_BE.Core.Entities;

[Table("QUESTION_MEDIA")]
public class QuestionMedia
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("MediaID")]
    public int MediaId { get; set; }

    [Required]
    [Column("QuestionID")]
    public int QuestionId { get; set; }

    [Required]
    [Column("MediaType")]
    public QuestionMediaType MediaType { get; set; }

    [Required]
    [Column("MediaUrl")]
    public string MediaUrl { get; set; } = string.Empty;

    [MaxLength(100)]
    [Column("Label")]
    public string? Label { get; set; }

    [Column("DurationSeconds")]
    public int? DurationSeconds { get; set; }

    [Column("OrderIndex")]
    public int OrderIndex { get; set; } = 1;

    [ForeignKey("QuestionId")]
    public virtual Question Question { get; set; } = null!;
}
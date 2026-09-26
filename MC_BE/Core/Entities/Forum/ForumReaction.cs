using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("forum_reactions")]
public class ForumReaction
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("ReactionID")]
    public int ReactionId { get; set; }

    [Required]
    [Column("UserID")]
    public int UserId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("TargetType")]
    public string TargetType { get; set; } = "POST"; // POST or COMMENT

    [Column("PostID")]
    public int? PostId { get; set; }

    [Column("CommentID")]
    public int? CommentId { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("ReactionType")]
    public string ReactionType { get; set; } = "LIKE"; // LIKE, LOVE, HELPFUL

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    [ForeignKey("PostId")]
    public virtual ForumPost? Post { get; set; }

    [ForeignKey("CommentId")]
    public virtual ForumComment? Comment { get; set; }
}

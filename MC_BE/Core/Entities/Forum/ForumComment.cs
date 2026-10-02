using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("forum_comments")]
public class ForumComment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("CommentID")]
    public int CommentId { get; set; }

    [Required]
    [Column("PostID")]
    public int PostId { get; set; }

    [Required]
    [Column("AuthorID")]
    public int AuthorId { get; set; }

    [Column("ParentCommentID")]
    public int? ParentCommentId { get; set; }

    [Column("DepthLevel")]
    public int DepthLevel { get; set; } = 1; // 1 for top-level, 2 for reply to Level 1

    [Required]
    [Column("Content")]
    public string Content { get; set; } = string.Empty;

    [Column("ImageUrl")]
    public string? ImageUrl { get; set; }

    [Column("IsAnonymous")]
    public bool IsAnonymous { get; set; } = false;

    [Column("ReactionsCount")]
    public int ReactionsCount { get; set; } = 0;

    [Column("ReportsCount")]
    public int ReportsCount { get; set; } = 0;

    [Required]
    [MaxLength(30)]
    [Column("Status")]
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, HIDDEN_BY_REPORTS, HIDDEN_BY_ADMIN, DELETED

    [Column("RestoredAt")]
    public DateTime? RestoredAt { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("PostId")]
    public virtual ForumPost Post { get; set; } = null!;

    [ForeignKey("AuthorId")]
    public virtual User Author { get; set; } = null!;

    [ForeignKey("ParentCommentId")]
    public virtual ForumComment? ParentComment { get; set; }

    public virtual ICollection<ForumComment> Replies { get; set; } = new List<ForumComment>();
    public virtual ICollection<ForumReaction> Reactions { get; set; } = new List<ForumReaction>();
    public virtual ICollection<ForumReport> Reports { get; set; } = new List<ForumReport>();
}

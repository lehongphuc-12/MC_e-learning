using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("forum_posts")]
public class ForumPost
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("PostID")]
    public int PostId { get; set; }

    [Required]
    [Column("TopicID")]
    public int TopicId { get; set; }

    [Required]
    [Column("AuthorID")]
    public int AuthorId { get; set; }

    [Required]
    [MaxLength(255)]
    [Column("Title")]
    public string Title { get; set; } = string.Empty;

    [Required]
    [Column("Content")]
    public string Content { get; set; } = string.Empty;

    [Column("ImageUrl")]
    public string? ImageUrl { get; set; }

    [Column("ViewsCount")]
    public int ViewsCount { get; set; } = 0;

    [Column("ReactionsCount")]
    public int ReactionsCount { get; set; } = 0;

    [Column("CommentsCount")]
    public int CommentsCount { get; set; } = 0;

    [Column("ReportsCount")]
    public int ReportsCount { get; set; } = 0;

    [Required]
    [MaxLength(30)]
    [Column("Status")]
    public string Status { get; set; } = "PUBLISHED"; // PUBLISHED, HIDDEN_BY_REPORTS, HIDDEN_BY_ADMIN, DELETED

    [Column("IsPinned")]
    public bool IsPinned { get; set; } = false;

    [Column("IsLocked")]
    public bool IsLocked { get; set; } = false;

    [Column("IsAnonymous")]
    public bool IsAnonymous { get; set; } = false;

    [Column("RestoredAt")]
    public DateTime? RestoredAt { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("TopicId")]
    public virtual ForumTopic Topic { get; set; } = null!;

    [ForeignKey("AuthorId")]
    public virtual User Author { get; set; } = null!;

    public virtual ICollection<ForumComment> Comments { get; set; } = new List<ForumComment>();
    public virtual ICollection<ForumReaction> Reactions { get; set; } = new List<ForumReaction>();
    public virtual ICollection<ForumReport> Reports { get; set; } = new List<ForumReport>();
}

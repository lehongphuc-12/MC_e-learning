using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("forum_topics")]
public class ForumTopic
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("TopicID")]
    public int TopicId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("Name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(120)]
    [Column("Slug")]
    public string Slug { get; set; } = string.Empty;

    [Column("Description")]
    public string? Description { get; set; }

    [MaxLength(50)]
    [Column("Icon")]
    public string? Icon { get; set; }

    [Column("OrderIndex")]
    public int OrderIndex { get; set; } = 1;

    [Required]
    [MaxLength(20)]
    [Column("Status")]
    public string Status { get; set; } = "ACTIVE";

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<ForumPost> Posts { get; set; } = new List<ForumPost>();
}

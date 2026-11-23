using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
namespace MC_BE.Core.Entities;
[Table("notifications")]
public class Notification
{
    [Key] public long Id { get; set; }
    public int UserId { get; set; }
    [MaxLength(60)] public string Type { get; set; } = "general";
    [MaxLength(250)] public string Title { get; set; } = "";
    [MaxLength(1000)] public string Message { get; set; } = "";
    [MaxLength(500)] public string? Url { get; set; }
    [MaxLength(200)] public string? DedupKey { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MC_BE.Core.Entities;

[Table("remedial_assignments")]
public class RemedialAssignment
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("RemedialAssignmentID")]
    public int RemedialAssignmentId { get; set; }

    [Column("CourseID")]
    public int CourseId { get; set; }

    [Required, MaxLength(200)]
    [Column("Title")]
    public string Title { get; set; } = string.Empty;

    [Required, MaxLength(1000)]
    [Column("Reason")]
    public string Reason { get; set; } = string.Empty;

    [Column("LessonID")]
    public int? LessonId { get; set; }

    [Column("QuizID")]
    public int? QuizId { get; set; }

    [Column("SpeakingScriptID")]
    public int? SpeakingScriptId { get; set; }

    [Column("TargetQuizID")]
    public int? TargetQuizId { get; set; }

    [Column("TargetSpeakingScriptID")]
    public int? TargetSpeakingScriptId { get; set; }

    [Column("AssignedByID")]
    public int AssignedById { get; set; }

    [Column("MaxAttempts")]
    public int MaxAttempts { get; set; } = 3;

    [Column("IsActive")]
    public bool IsActive { get; set; } = true;

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual Course Course { get; set; } = null!;
    public virtual User AssignedBy { get; set; } = null!;
    public virtual Lesson? Lesson { get; set; }
    public virtual Quiz? Quiz { get; set; }
    public virtual SpeakingScript? SpeakingScript { get; set; }
    public virtual Quiz? TargetQuiz { get; set; }
    public virtual SpeakingScript? TargetSpeakingScript { get; set; }
    public virtual ICollection<RemedialAssignmentRecipient> Recipients { get; set; } = new List<RemedialAssignmentRecipient>();
    public virtual ICollection<RemedialAssignmentEvent> Events { get; set; } = new List<RemedialAssignmentEvent>();
}

[Table("remedial_assignment_recipients")]
public class RemedialAssignmentRecipient
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("RecipientID")]
    public int RecipientId { get; set; }

    [Column("RemedialAssignmentID")]
    public int RemedialAssignmentId { get; set; }

    [Column("StudentID")]
    public int StudentId { get; set; }

    [Column("AssignedAt")]
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    [Column("DueAt")]
    public DateTime? DueAt { get; set; }

    [Required, MaxLength(24)]
    [Column("Status")]
    public string Status { get; set; } = "ASSIGNED";

    [Column("AttemptsUsed")]
    public int AttemptsUsed { get; set; }

    [Column("CompletedAt")]
    public DateTime? CompletedAt { get; set; }

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public virtual RemedialAssignment Assignment { get; set; } = null!;
    public virtual User Student { get; set; } = null!;
}

[Table("remedial_assignment_events")]
public class RemedialAssignmentEvent
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("EventID")]
    public long EventId { get; set; }

    [Column("RemedialAssignmentID")]
    public int RemedialAssignmentId { get; set; }

    [Column("StudentID")]
    public int? StudentId { get; set; }

    [Column("ActorID")]
    public int ActorId { get; set; }

    [Required, MaxLength(40)]
    [Column("EventType")]
    public string EventType { get; set; } = string.Empty;

    [MaxLength(2000)]
    [Column("Details")]
    public string? Details { get; set; }

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual RemedialAssignment Assignment { get; set; } = null!;
}

[Table("remedial_retake_grants")]
public class RemedialRetakeGrant
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("GrantID")]
    public int GrantId { get; set; }

    [Column("RecipientID")]
    public int RecipientId { get; set; }

    [Column("LearnerID")]
    public int LearnerId { get; set; }

    [Column("TargetQuizID")]
    public int? TargetQuizId { get; set; }

    [Column("TargetSpeakingScriptID")]
    public int? TargetSpeakingScriptId { get; set; }

    [Column("GrantedAt")]
    public DateTime GrantedAt { get; set; } = DateTime.UtcNow;

    [Column("UsedAt")]
    public DateTime? UsedAt { get; set; }

    public virtual RemedialAssignmentRecipient Recipient { get; set; } = null!;
    public virtual User Learner { get; set; } = null!;
    public virtual Quiz? TargetQuiz { get; set; }
    public virtual SpeakingScript? TargetSpeakingScript { get; set; }
}

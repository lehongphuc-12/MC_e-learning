using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using MC_BE.Core.Entities.Chat;

namespace MC_BE.Core.Entities;

[Table("users")]
public class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    [Column("UserID")]
    public int UserId { get; set; }

    [Required]
    [Column("RoleID")]
    public int RoleId { get; set; }

    [Required]
    [MaxLength(100)]
    [Column("FullName")]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    [EmailAddress]
    [Column("Email")]
    public string Email { get; set; } = string.Empty;

    [MaxLength(255)]
    [Column("PasswordHash")]
    public string? PasswordHash { get; set; }

    [Column("IsGoogleLogin")]
    public bool IsGoogleLogin { get; set; } = false;

    [MaxLength(20)]
    [Column("PhoneNumber")]
    public string? PhoneNumber { get; set; }

    [MaxLength(255)]
    [Column("AvatarUrl")]
    public string? AvatarUrl { get; set; }

    [Required]
    [MaxLength(20)]
    [Column("Status")]
    public string Status { get; set; } = "ACTIVE";

    [Column("CreatedAt")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("UpdatedAt")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [Column("LastLoginAt")]
    public DateTime? LastLoginAt { get; set; }

    [Column("LastSeenAt")]
    public DateTime? LastSeenAt { get; set; }

    // ============================================================
    // AUTH / USER
    // ============================================================

    [ForeignKey(nameof(RoleId))]
    public virtual Role Role { get; set; } = null!;

    public virtual UserProfile? UserProfile { get; set; }

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    // ============================================================
    // COURSE
    // ============================================================

    public virtual ICollection<Course> InstructedCourses { get; set; } = new List<Course>();
    public virtual ICollection<CourseMaterial> UploadedMaterials { get; set; } = new List<CourseMaterial>();

    // ============================================================
    // ENROLLMENT
    // ============================================================

    public virtual ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

    // ============================================================
    // PAYMENT
    // ============================================================

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    // ============================================================
    // QUIZ
    // ============================================================

    public virtual ICollection<Quiz> CreatedQuizzes { get; set; } = new List<Quiz>();
    public virtual ICollection<QuizAttempt> QuizAttempts { get; set; } = new List<QuizAttempt>();

    // ============================================================
    // CHAT
    // ============================================================

    public virtual ICollection<Conversation> ConversationsAsUser1 { get; set; } = new List<Conversation>();
    public virtual ICollection<Conversation> ConversationsAsUser2 { get; set; } = new List<Conversation>();
    public virtual ICollection<ChatMessage> SentChatMessages { get; set; } = new List<ChatMessage>();
    public virtual ICollection<MessageReaction> MessageReactions { get; set; } = new List<MessageReaction>();
    public virtual ICollection<ConversationRead> ConversationReads { get; set; } = new List<ConversationRead>();
    public virtual ICollection<ChatCall> CallsMade { get; set; } = new List<ChatCall>();
    public virtual ICollection<ChatCall> CallsReceived { get; set; } = new List<ChatCall>();
}
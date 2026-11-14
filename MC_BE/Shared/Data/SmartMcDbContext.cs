using System;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using Microsoft.EntityFrameworkCore;

using Conversation = MC_BE.Core.Entities.Chat.Conversation;
using ChatMessage = MC_BE.Core.Entities.Chat.ChatMessage;
using MessageAttachment = MC_BE.Core.Entities.Chat.MessageAttachment;
using MessageReaction = MC_BE.Core.Entities.Chat.MessageReaction;
using ConversationRead = MC_BE.Core.Entities.Chat.ConversationRead;
using StickerPack = MC_BE.Core.Entities.Chat.StickerPack;
using Sticker = MC_BE.Core.Entities.Chat.Sticker;
using ChatCall = MC_BE.Core.Entities.Chat.ChatCall;
using MC_BE.Core.Entities;
namespace MC_BE.Shared.Data;

public class SmartMcDbContext : DbContext
{
    public SmartMcDbContext(
        DbContextOptions<SmartMcDbContext> options)
        : base(options)
    {
    }

    // ============================================================
    // Section 1: Auth & User
    // ============================================================

    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<UserProfile> UserProfiles { get; set; } = null!;
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

    // ============================================================
    // Section 2: Course & Learning
    // ============================================================

    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Course> Courses { get; set; } = null!;
    public DbSet<Module> Modules { get; set; } = null!;
    public DbSet<Lesson> Lessons { get; set; } = null!;
    public DbSet<CourseMaterial> CourseMaterials { get; set; } = null!;
    public DbSet<Enrollment> Enrollments { get; set; } = null!;
    public DbSet<LessonProgress> LessonProgresses { get; set; } = null!;
    public DbSet<Certificate> Certificates { get; set; } = null!;
    public DbSet<SpeakingSubmission> SpeakingSubmissions { get; set; } = null!;
    public DbSet<SpeakingScript> SpeakingScripts { get; set; } = null!;
    public DbSet<SpeakingScriptLevel> SpeakingScriptLevels { get; set; } = null!;
    public DbSet<BackgroundMusic> BackgroundMusics { get; set; } = null!;
    public DbSet<VideoUploadSession> VideoUploadSessions { get; set; } = null!;
    public DbSet<R2ObjectDeletionJob> R2ObjectDeletionJobs { get; set; } = null!;
    public DbSet<CourseDeletionRequest> CourseDeletionRequests { get; set; } = null!;
    public DbSet<CourseGiftPolicy> CourseGiftPolicies { get; set; } = null!;
    public DbSet<CourseAccessGrant> CourseAccessGrants { get; set; } = null!;
    public DbSet<CourseSyllabusVersion> CourseSyllabusVersions { get; set; } = null!;
    public DbSet<CourseSyllabusUploadSession> CourseSyllabusUploadSessions { get; set; } = null!;

    // ============================================================
    // Section 3: Payment
    // ============================================================

    public DbSet<Payment> Payments { get; set; } = null!;
public DbSet<PaymentItem> PaymentItems { get; set; } = null!;
public DbSet<PaymentTransaction> PaymentTransactions { get; set; } = null!;

    // ============================================================
// Section 4: Quiz & Assessment
// ============================================================

public DbSet<Quiz> Quizzes { get; set; } = null!;
public DbSet<Question> Questions { get; set; } = null!;
public DbSet<Choice> Choices { get; set; } = null!;
public DbSet<QuizAttempt> QuizAttempts { get; set; } = null!;
public DbSet<QuizAnswer> QuizAnswers { get; set; } = null!;

// Question configuration
public DbSet<QuestionMedia> QuestionMedia { get; set; } = null!;
public DbSet<QuestionErrorRegion> QuestionErrorRegions { get; set; } = null!;
public DbSet<QuestionAnnotation> QuestionAnnotations { get; set; } = null!;
public DbSet<QuestionArrangeItem> QuestionArrangeItems { get; set; } = null!;
public DbSet<QuestionWritingConfig> QuestionWritingConfigs { get; set; } = null!;

// Scenario Decision Tree
public DbSet<ScenarioNode> ScenarioNodes { get; set; } = null!;
public DbSet<ScenarioChoice> ScenarioChoices { get; set; } = null!;

// Learner answers
public DbSet<QuizAnswerSelectedChoice> QuizAnswerSelectedChoices { get; set; } = null!;
public DbSet<QuizAnswerErrorRegion> QuizAnswerErrorRegions { get; set; } = null!;
public DbSet<QuizAnswerAnnotation> QuizAnswerAnnotations { get; set; } = null!;
public DbSet<QuizAnswerArrangeItem> QuizAnswerArrangeItems { get; set; } = null!;
public DbSet<QuizAnswerScenarioPath> QuizAnswerScenarioPaths { get; set; } = null!;

    // ============================================================
    // Section 5: Chat
    // ============================================================

    public DbSet<Conversation> Conversations { get; set; } = null!;
    public DbSet<ChatMessage> ChatMessages { get; set; } = null!;
    public DbSet<MessageAttachment> MessageAttachments { get; set; } = null!;
    public DbSet<MessageReaction> MessageReactions { get; set; } = null!;
    public DbSet<ConversationRead> ConversationReads { get; set; } = null!;
    public DbSet<StickerPack> StickerPacks { get; set; } = null!;
    public DbSet<Sticker> Stickers { get; set; } = null!;
    public DbSet<ChatCall> ChatCalls { get; set; } = null!;

    // ============================================================
    // Section 6: Forum
    // ============================================================

    public DbSet<ForumTopic> ForumTopics { get; set; } = null!;
    public DbSet<ForumPost> ForumPosts { get; set; } = null!;
    public DbSet<ForumComment> ForumComments { get; set; } = null!;
    public DbSet<ForumReaction> ForumReactions { get; set; } = null!;
    public DbSet<ForumReport> ForumReports { get; set; } = null!;
    // AI PRACTICE (bảng riêng, không thay đổi bảng feedback cũ)
    public DbSet<AIPracticeSession> AIPracticeSessions { get; set; } = null!;
    public DbSet<AIPracticeFeedback> AIPracticeFeedbacks { get; set; } = null!;

    public DbSet<AIPronunciationFeedback> AIPronunciationFeedbacks
    { get; set; } = null!;
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ============================================================
        // Section 1: Auth & User
        // ============================================================

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");
            entity.HasIndex(e => e.RoleName).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasIndex(e => e.Email).IsUnique();

            entity.Property(e => e.Status)
                .HasDefaultValue("ACTIVE");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Role)
                .WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("user_profiles");

            entity.HasIndex(e => e.UserId)
                .IsUnique();

            entity.Property(e => e.PreferredLanguage)
                .HasDefaultValue("en");

            entity.HasOne(d => d.User)
                .WithOne(p => p.UserProfile)
                .HasForeignKey<UserProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("password_reset_tokens");

            entity.HasIndex(e => e.Token);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");

            entity.HasIndex(e => e.Token);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany(p => p.RefreshTokens)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ============================================================
        // Section 2: Course & Learning
        // ============================================================

        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories");

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(CategoryStatus.ACTIVE);
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.ToTable("courses", table => table.HasCheckConstraint(
                "CK_courses_FreePriceConsistency",
                "(\"IsFree\" = TRUE AND \"Price\" = 0) OR (\"IsFree\" = FALSE AND \"Price\" > 0)"));

            entity.HasKey(e => e.CourseId);

            entity.HasIndex(e => e.Slug)
                .IsUnique();

            entity.Property(e => e.Price)
                .HasDefaultValue(0.00m);

            entity.Property(e => e.IsFree)
                .HasDefaultValue(false);

            entity.Property(e => e.Level)
                .HasConversion<string>();

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(CourseStatus.DRAFT);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Category)
                .WithMany(p => p.Courses)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.Instructor)
                .WithMany(p => p.InstructedCourses)
                .HasForeignKey(d => d.InstructorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.SubmittedSyllabusVersion)
                .WithMany()
                .HasForeignKey(d => d.SubmittedSyllabusVersionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.ApprovedSyllabusVersion)
                .WithMany()
                .HasForeignKey(d => d.ApprovedSyllabusVersionId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CourseSyllabusVersion>(entity =>
        {
            entity.ToTable("course_syllabus_versions");
            entity.HasKey(version => version.SyllabusVersionId);
            entity.HasIndex(version => new { version.CourseId, version.VersionNumber }).IsUnique();
            entity.HasIndex(version => new { version.CourseId, version.IsCurrent })
                .IsUnique()
                .HasFilter("\"IsCurrent\" = TRUE");
            entity.HasIndex(version => new { version.CourseId, version.ReviewStatus });
            entity.HasIndex(version => version.ObjectKey).IsUnique();
            entity.Property(version => version.ReviewStatus).HasDefaultValue("DRAFT");
            entity.Property(version => version.IsCurrent).HasDefaultValue(true);
            entity.Property(version => version.UploadedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(version => version.Course)
                .WithMany(course => course.SyllabusVersions)
                .HasForeignKey(version => version.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(version => version.UploadedBy)
                .WithMany()
                .HasForeignKey(version => version.UploadedById)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(version => version.ReviewedBy)
                .WithMany()
                .HasForeignKey(version => version.ReviewedById)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CourseSyllabusUploadSession>(entity =>
        {
            entity.ToTable("course_syllabus_upload_sessions");
            entity.HasKey(session => session.SessionId);
            entity.HasIndex(session => new { session.CourseId, session.Status, session.ExpiresAt });
            entity.HasIndex(session => session.ObjectKey).IsUnique();
            entity.Property(session => session.Status).HasDefaultValue("PENDING");
            entity.Property(session => session.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(session => session.Course)
                .WithMany()
                .HasForeignKey(session => session.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(session => session.Instructor)
                .WithMany()
                .HasForeignKey(session => session.InstructorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<CourseGiftPolicy>(entity =>
        {
            entity.ToTable("course_gift_policies");
            entity.HasKey(e => e.PolicyId);
            entity.HasIndex(e => e.GiftCourseId).IsUnique();
            entity.Property(e => e.IsActive).HasDefaultValue(false);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(e => e.GiftCourse).WithMany().HasForeignKey(e => e.GiftCourseId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.UpdatedByAdmin).WithMany().HasForeignKey(e => e.UpdatedByAdminId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CourseAccessGrant>(entity =>
        {
            entity.ToTable("course_access_grants");
            entity.HasKey(e => e.GrantId);
            entity.HasIndex(e => new { e.LearnerId, e.CourseId, e.Status });
            entity.HasIndex(e => new { e.SourcePaymentItemId, e.CourseId, e.SourceType })
                .IsUnique()
                .HasFilter("\"SourcePaymentItemId\" IS NOT NULL");
            entity.Property(e => e.SourceType).HasMaxLength(30).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("ACTIVE");
            entity.Property(e => e.GrantedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne(e => e.Learner).WithMany().HasForeignKey(e => e.LearnerId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Course).WithMany().HasForeignKey(e => e.CourseId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.SourcePaymentItem).WithMany().HasForeignKey(e => e.SourcePaymentItemId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.SourceEnrollment).WithMany().HasForeignKey(e => e.SourceEnrollmentId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Module>(entity =>
        {
            entity.ToTable("modules");

            entity.Property(e => e.OrderIndex)
                .HasDefaultValue(1);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Course)
                .WithMany(p => p.Modules)
                .HasForeignKey(d => d.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.ToTable("lessons");

            entity.Property(e => e.LessonType)
                .HasConversion<string>();

            entity.Property(e => e.OrderIndex)
                .HasDefaultValue(1);

            entity.Property(e => e.DurationMinutes)
                .HasDefaultValue(0);

            entity.Property(e => e.IsPreview)
                .HasDefaultValue(false);

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(LessonStatus.ACTIVE);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Course)
                .WithMany(p => p.Lessons)
                .HasForeignKey(d => d.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Module)
                .WithMany(p => p.Lessons)
                .HasForeignKey(d => d.ModuleId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<CourseMaterial>(entity =>
        {
            entity.ToTable("course_materials");

            entity.Property(e => e.MaterialType)
                .HasConversion<string>();

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.FileUrl)
                .HasColumnType("text");

            entity.Property(e => e.Title)
                .HasMaxLength(500);

            entity.HasOne(d => d.Course)
                .WithMany(p => p.CourseMaterials)
                .HasForeignKey(d => d.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Lesson)
                .WithMany(p => p.CourseMaterials)
                .HasForeignKey(d => d.LessonId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.Uploader)
                .WithMany(p => p.UploadedMaterials)
                .HasForeignKey(d => d.UploaderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<VideoUploadSession>(entity =>
        {
            entity.ToTable("video_upload_sessions");
            entity.HasKey(e => e.SessionId);
            entity.HasIndex(e => e.ObjectKey).IsUnique();
            entity.HasIndex(e => new { e.Status, e.ExpiresAt });
            entity.Property(e => e.Status).HasDefaultValue("PENDING");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasOne<Lesson>().WithMany().HasForeignKey(e => e.LessonId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<Course>().WithMany().HasForeignKey(e => e.CourseId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<R2ObjectDeletionJob>(entity =>
        {
            entity.ToTable("r2_object_deletion_jobs");
            entity.HasKey(job => job.JobId);
            entity.HasIndex(job => new { job.Status, job.NextAttemptAt });
            entity.HasIndex(job => new { job.SourceCourseId, job.ObjectKey }).IsUnique();
            entity.Property(job => job.Status).HasDefaultValue("PENDING");
            entity.Property(job => job.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(job => job.NextAttemptAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            // No Course FK: deletion records must survive the course's cascading database delete.
        });

        modelBuilder.Entity<CourseDeletionRequest>(entity =>
        {
            entity.ToTable("course_deletion_requests");
            entity.HasKey(request => request.RequestId);
            entity.HasIndex(request => new { request.Status, request.RequestedAt });
            entity.HasIndex(request => request.CourseId)
                .IsUnique()
                .HasFilter("\"Status\" = 'PENDING'");
            entity.Property(request => request.Status).HasDefaultValue("PENDING");
            entity.Property(request => request.RequestedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            // No FK to courses: retain the request as an audit record after an approved deletion.
        });

        // ============================================================
        // ENROLLMENT CONFIGURATION
        // ============================================================

        modelBuilder.Entity<Enrollment>(entity =>
        {
            entity.ToTable("enrollments");

            entity.HasKey(e => e.EnrollmentId);

            entity.HasIndex(e => new
            {
                e.LearnerId,
                e.CourseId,
                e.Status
            });

            entity.HasIndex(e => new
{
    e.LearnerId,
    e.CourseId
})
.IsUnique()
.HasFilter("\"Status\" IN ('PENDING_PAYMENT', 'ACTIVE')");

            entity.Property(e => e.Status)
                .HasDefaultValue("PENDING_PAYMENT");

            entity.Property(e => e.CompletionPercentage)
                .HasDefaultValue(0);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Learner)
                .WithMany("Enrollments")
                .HasForeignKey(e => e.LearnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Course)
                .WithMany(c => c.Enrollments)
                .HasForeignKey(e => e.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
                });

        modelBuilder.Entity<LessonProgress>(entity =>
        {
            entity.ToTable("lesson_progresses");

            entity.HasIndex(e => new
            {
                e.EnrollmentId,
                e.LessonId
            }).IsUnique();

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(LessonProgressStatus.NOT_STARTED);

            entity.Property(e => e.TimeSpentMinutes)
                .HasDefaultValue(0);

            entity.HasOne(d => d.Enrollment)
                .WithMany(p => p.LessonProgresses)
                .HasForeignKey(d => d.EnrollmentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Lesson)
                .WithMany(p => p.LessonProgresses)
                .HasForeignKey(d => d.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Certificate>(entity =>
        {
            entity.ToTable("certificates");

            entity.HasIndex(e => e.CertificateCode)
                .IsUnique();

            entity.HasIndex(e => e.EnrollmentId)
                .IsUnique();

            entity.Property(e => e.CompletionPercentage)
                .HasDefaultValue(100.00m);

            entity.Property(e => e.Status)
                .HasDefaultValue("ACTIVE");

            entity.Property(e => e.IssuedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Enrollment)
                .WithMany()
                .HasForeignKey(d => d.EnrollmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SpeakingScript>(entity =>
        {
            entity.ToTable("speaking_scripts");
            entity.HasKey(e => e.ScriptId);

            entity.HasIndex(e => e.CourseId);
            entity.HasIndex(e => e.ModuleId);
            entity.HasIndex(e => e.LessonId).IsUnique().HasFilter("\"LessonID\" IS NOT NULL");

            entity.Property(e => e.Scope)
                .HasConversion<string>()
                .HasDefaultValue(SpeakingScope.FINAL);

            entity.Property(e => e.PassingScore)
                .HasPrecision(5, 2)
                .HasDefaultValue(80.00m);

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(SpeakingScriptStatus.DRAFT);

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Course)
                .WithMany()
                .HasForeignKey(d => d.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Module)
                .WithMany()
                .HasForeignKey(d => d.ModuleId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.Lesson)
                .WithOne(l => l.SpeakingScript)
                .HasForeignKey<SpeakingScript>(d => d.LessonId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.CreatedByUser)
                .WithMany()
                .HasForeignKey(d => d.CreatedBy)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<SpeakingScriptLevel>(entity =>
        {
            entity.ToTable("speaking_script_levels");
            entity.HasKey(e => e.LevelId);
            entity.HasIndex(e => new { e.ScriptId, e.Level }).IsUnique();

            entity.Property(e => e.Level)
                .HasConversion<string>();

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Script)
                .WithMany(s => s.Levels)
                .HasForeignKey(d => d.ScriptId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BackgroundMusic>(entity =>
        {
            entity.ToTable("background_musics");
            entity.HasKey(e => e.MusicId);
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Lesson)
                .WithMany()
                .HasForeignKey(d => d.LessonId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasData(
                new BackgroundMusic
                {
                    MusicId = 1,
                    Title = "Lãng mạn",
                    AudioUrl = "https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227349/background-music/system/lang_man.mp3",
                    CloudinaryPublicId = "background-music/system/lang_man",
                    IsSystemDefault = true,
                    LessonId = null,
                    CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new BackgroundMusic
                {
                    MusicId = 2,
                    Title = "Sang trọng",
                    AudioUrl = "https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227354/background-music/system/sang_trong.mp3",
                    CloudinaryPublicId = "background-music/system/sang_trong",
                    IsSystemDefault = true,
                    LessonId = null,
                    CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new BackgroundMusic
                {
                    MusicId = 3,
                    Title = "Sôi động",
                    AudioUrl = "https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227356/background-music/system/soi_dong.mp3",
                    CloudinaryPublicId = "background-music/system/soi_dong",
                    IsSystemDefault = true,
                    LessonId = null,
                    CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                },
                new BackgroundMusic
                {
                    MusicId = 4,
                    Title = "Truyền cảm hứng",
                    AudioUrl = "https://res.cloudinary.com/dsbhtgduv/video/upload/v1794227359/background-music/system/truyen_cam_hung.mp3",
                    CloudinaryPublicId = "background-music/system/truyen_cam_hung",
                    IsSystemDefault = true,
                    LessonId = null,
                    CreatedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
                }
            );
        });

        modelBuilder.Entity<SpeakingSubmission>(entity =>
        {
            entity.ToTable("speaking_submissions");
            entity.HasKey(e => e.SubmissionId);

            entity.HasIndex(e => new { e.LearnerId, e.LessonId });
            entity.HasIndex(e => new { e.LearnerId, e.ScriptId });
            entity.HasIndex(e => e.Status);

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(SpeakingSubmissionStatus.SUBMITTED);

            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.SpeakingScript)
                .WithMany()
                .HasForeignKey(d => d.ScriptId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Lesson)
                .WithMany()
                .HasForeignKey(d => d.LessonId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Learner)
                .WithMany()
                .HasForeignKey(d => d.LearnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.GradedBy)
                .WithMany()
                .HasForeignKey(d => d.GradedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Section 3: Payment Configuration
        // ============================================================
        // CHAT
        // ============================================================

        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.ToTable("conversations");

            entity.HasKey(x => x.ConversationId);

            entity.HasIndex(x => new
            {
                x.User1Id,
                x.User2Id
            }).IsUnique();

            entity.HasIndex(x => x.LastMessageAt);

            entity.Property(x => x.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(x => x.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(x => x.User1)
                .WithMany(x => x.ConversationsAsUser1)
                .HasForeignKey(x => x.User1Id)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.User2)
                .WithMany(x => x.ConversationsAsUser2)
                .HasForeignKey(x => x.User2Id)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ChatMessage>(entity =>
        {
            entity.ToTable("chat_messages");

            entity.HasKey(x => x.MessageId);

            entity.HasIndex(x => new
            {
                x.ConversationId,
                x.MessageId
            });

            entity.Property(x => x.MessageType)
                .HasConversion<string>();

            entity.Property(x => x.Status)
                .HasConversion<string>();

            entity.HasOne(x => x.Conversation)
                .WithMany(x => x.Messages)
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Sender)
                .WithMany(x => x.SentChatMessages)
                .HasForeignKey(x => x.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Sticker)
                .WithMany()
                .HasForeignKey(x => x.StickerId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.ReplyToMessage)
                .WithMany(x => x.Replies)
                .HasForeignKey(x => x.ReplyToMessageId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<MessageAttachment>(entity =>
        {
            entity.ToTable("message_attachments");

            entity.HasKey(x => x.AttachmentId);

            entity.HasIndex(x => x.MessageId);

            entity.HasOne(x => x.Message)
                .WithMany(x => x.Attachments)
                .HasForeignKey(x => x.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<MessageReaction>(entity =>
        {
            entity.ToTable("message_reactions");

            entity.HasKey(x => x.ReactionId);

            entity.HasIndex(x => new
            {
                x.MessageId,
                x.UserId
            }).IsUnique();

            entity.HasOne(x => x.Message)
                .WithMany(x => x.Reactions)
                .HasForeignKey(x => x.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany(x => x.MessageReactions)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ConversationRead>(entity =>
        {
            entity.ToTable("conversation_reads");

            entity.HasKey(x => x.ConversationReadId);

            entity.HasIndex(x => new
            {
                x.ConversationId,
                x.UserId
            }).IsUnique();

            entity.HasOne(x => x.Conversation)
                .WithMany(x => x.Reads)
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany(x => x.ConversationReads)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StickerPack>(entity =>
        {
            entity.ToTable("sticker_packs");

            entity.HasKey(x => x.StickerPackId);

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true);
        });

        modelBuilder.Entity<Sticker>(entity =>
        {
            entity.ToTable("stickers");

            entity.HasKey(x => x.StickerId);

            entity.HasIndex(x => x.StickerPackId);

            entity.Property(x => x.IsActive)
                .HasDefaultValue(true);

            entity.HasOne(x => x.StickerPack)
                .WithMany(x => x.Stickers)
                .HasForeignKey(x => x.StickerPackId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ============================================================
        // DEFAULT CHAT STICKERS
        // ============================================================

        var stickerSeedDate = new DateTime(2026, 9, 24, 0, 0, 0, DateTimeKind.Utc);

        modelBuilder.Entity<StickerPack>().HasData(new StickerPack
        {
            StickerPackId = 1,
            Name = "Cảm xúc",
            ThumbnailUrl = "/uploads/stickers/default/sticker-01.png",
            IsActive = true,
            CreatedAt = stickerSeedDate
        });

        modelBuilder.Entity<Sticker>().HasData(
            new Sticker { StickerId = 1, StickerPackId = 1, Name = "Cười", ImageUrl = "/uploads/stickers/default/sticker-01.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 2, StickerPackId = 1, Name = "Cười lớn", ImageUrl = "/uploads/stickers/default/sticker-02.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 3, StickerPackId = 1, Name = "Cười ngặt nghẽo", ImageUrl = "/uploads/stickers/default/sticker-03.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 4, StickerPackId = 1, Name = "Yêu", ImageUrl = "/uploads/stickers/default/sticker-04.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 5, StickerPackId = 1, Name = "Hôn", ImageUrl = "/uploads/stickers/default/sticker-05.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 6, StickerPackId = 1, Name = "Ngầu", ImageUrl = "/uploads/stickers/default/sticker-06.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 7, StickerPackId = 1, Name = "Suy nghĩ", ImageUrl = "/uploads/stickers/default/sticker-07.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 8, StickerPackId = 1, Name = "Buồn", ImageUrl = "/uploads/stickers/default/sticker-08.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 9, StickerPackId = 1, Name = "Khóc", ImageUrl = "/uploads/stickers/default/sticker-09.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 10, StickerPackId = 1, Name = "Giận", ImageUrl = "/uploads/stickers/default/sticker-10.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 11, StickerPackId = 1, Name = "Sốc", ImageUrl = "/uploads/stickers/default/sticker-11.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 12, StickerPackId = 1, Name = "Ngại", ImageUrl = "/uploads/stickers/default/sticker-12.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 13, StickerPackId = 1, Name = "Nóng", ImageUrl = "/uploads/stickers/default/sticker-13.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 14, StickerPackId = 1, Name = "Lạnh", ImageUrl = "/uploads/stickers/default/sticker-14.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 15, StickerPackId = 1, Name = "Tiệc", ImageUrl = "/uploads/stickers/default/sticker-15.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 16, StickerPackId = 1, Name = "Tim đỏ", ImageUrl = "/uploads/stickers/default/sticker-16.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 17, StickerPackId = 1, Name = "Thích", ImageUrl = "/uploads/stickers/default/sticker-17.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 18, StickerPackId = 1, Name = "Không thích", ImageUrl = "/uploads/stickers/default/sticker-18.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 19, StickerPackId = 1, Name = "Vỗ tay", ImageUrl = "/uploads/stickers/default/sticker-19.png", IsActive = true, CreatedAt = stickerSeedDate },
            new Sticker { StickerId = 20, StickerPackId = 1, Name = "Ăn mừng", ImageUrl = "/uploads/stickers/default/sticker-20.png", IsActive = true, CreatedAt = stickerSeedDate }
        );

        modelBuilder.Entity<ChatCall>(entity =>
        {
            entity.ToTable("chat_calls");

            entity.HasKey(x => x.CallId);

            entity.HasIndex(x => x.ConversationId);
            entity.HasIndex(x => x.CallerId);
            entity.HasIndex(x => x.ReceiverId);
            entity.HasIndex(x => x.Status);

            entity.Property(x => x.CallType)
                .HasConversion<string>();

            entity.Property(x => x.Status)
                .HasConversion<string>();

            entity.HasOne(x => x.Conversation)
                .WithMany(x => x.Calls)
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Caller)
                .WithMany(x => x.CallsMade)
                .HasForeignKey(x => x.CallerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Receiver)
                .WithMany(x => x.CallsReceived)
                .HasForeignKey(x => x.ReceiverId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ============================================================
        // PAYMENT CONFIGURATION
        // ============================================================

        modelBuilder.Entity<Payment>(entity =>
{
    entity.ToTable("PAYMENT");

    entity.HasKey(e => e.PaymentId);

    entity.HasIndex(e => e.MerchantTxnRef)
        .IsUnique();

    entity.HasIndex(e => e.LearnerId);

    entity.Property(e => e.Currency)
        .HasDefaultValue("VND");

    entity.Property(e => e.PaymentMethod)
        .HasDefaultValue("PAYOS");

    entity.Property(e => e.Status)
        .HasDefaultValue("PENDING");

    entity.Property(e => e.CreatedAt)
        .HasDefaultValueSql("CURRENT_TIMESTAMP");

    entity.Property(e => e.UpdatedAt)
        .HasDefaultValueSql("CURRENT_TIMESTAMP");

    entity.HasOne(e => e.Learner)
        .WithMany()
        .HasForeignKey(e => e.LearnerId)
        .OnDelete(DeleteBehavior.Restrict);
});

         modelBuilder.Entity<PaymentItem>(entity =>
{
    entity.ToTable("PAYMENT_ITEM");

    entity.HasKey(e => e.PaymentItemId);

    entity.HasIndex(e => new
    {
        e.PaymentId,
        e.EnrollmentId
    }).IsUnique();

    entity.HasIndex(e => e.EnrollmentId);

    entity.HasIndex(e => e.CourseId);

    entity.Property(e => e.CreatedAt)
        .HasDefaultValueSql("CURRENT_TIMESTAMP");

    entity.HasOne(e => e.Payment)
        .WithMany(p => p.Items)
        .HasForeignKey(e => e.PaymentId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(e => e.Enrollment)
    .WithMany(e => e.PaymentItems)
    .HasForeignKey(e => e.EnrollmentId)
    .OnDelete(DeleteBehavior.Restrict);

    entity.HasOne(e => e.Course)
        .WithMany()
        .HasForeignKey(e => e.CourseId)
        .OnDelete(DeleteBehavior.Restrict);
});

        // ============================================================
        // PAYMENT TRANSACTION CONFIGURATION
        // ============================================================

        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.ToTable("payment_transactions");

            entity.HasKey(e => e.TransactionId);

            entity.Property(e => e.TransactionId)
                .HasColumnName("TransactionID");

            entity.Property(e => e.PaymentId)
                .HasColumnName("PaymentID");

            entity.Property(e => e.Provider)
                .HasColumnName("Provider")
                .HasDefaultValue("PAYOS");

            entity.Property(e => e.ProviderTransactionNo)
                .HasColumnName("ProviderTransactionNo");

            entity.Property(e => e.ResponseCode)
                .HasColumnName("ResponseCode");

            entity.Property(e => e.TransactionStatus)
                .HasColumnName("TransactionStatus");

            entity.Property(e => e.BankCode)
                .HasColumnName("BankCode");

            entity.Property(e => e.Amount)
                .HasColumnName("Amount");

            entity.Property(e => e.Status)
                .HasColumnName("Status")
                .HasDefaultValue("PENDING");

            entity.Property(e => e.SignatureValid)
                .HasColumnName("SignatureValid");

            entity.Property(e => e.ProcessedAt)
                .HasColumnName("ProcessedAt");

            entity.Property(e => e.CreatedAt)
                .HasColumnName("CreatedAt")
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => e.PaymentId);
            entity.HasIndex(e => e.ProviderTransactionNo)
    .IsUnique()
    .HasFilter("\"ProviderTransactionNo\" IS NOT NULL");
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Payment)
                .WithMany(p => p.Transactions)
                .HasForeignKey(e => e.PaymentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ============================================================
// Section 4: Quiz & Assessment Configuration
// ============================================================

modelBuilder.Entity<Quiz>(entity =>
{
    entity.ToTable("quizzes");

    entity.Property(e => e.TimeLimitMinutes)
        .HasDefaultValue(0);

    entity.Property(e => e.PassingScore)
        .HasDefaultValue(80.00m);

    entity.Property(e => e.MaxAttempts)
        .HasDefaultValue(1);

    entity.Property(e => e.Status)
        .HasConversion<string>()
        .HasDefaultValue(QuizStatus.ACTIVE);

    entity.Property(e => e.CreatedAt)
        .HasDefaultValueSql("CURRENT_TIMESTAMP");

    entity.HasOne(d => d.Course)
        .WithMany(p => p.Quizzes)
        .HasForeignKey(d => d.CourseId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(d => d.Lesson)
        .WithMany(p => p.Quizzes)
        .HasForeignKey(d => d.LessonId)
        .OnDelete(DeleteBehavior.SetNull);

    entity.HasOne(d => d.CreatedBy)
        .WithMany(p => p.CreatedQuizzes)
        .HasForeignKey(d => d.CreatedById)
        .OnDelete(DeleteBehavior.Restrict);
});

modelBuilder.Entity<Question>(entity =>
{
    entity.ToTable("questions");

    entity.Property(e => e.QuestionType)
        .HasConversion<string>();

    entity.Property(e => e.Points)
        .HasDefaultValue(1.00m);

    entity.Property(e => e.IsRequired)
        .HasDefaultValue(true);

    entity.Property(e => e.OrderIndex)
        .HasDefaultValue(1);

    entity.HasIndex(e => new { e.QuizId, e.OrderIndex });

    entity.HasOne(d => d.Quiz)
        .WithMany(p => p.Questions)
        .HasForeignKey(d => d.QuizId)
        .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<Choice>(entity =>
{
    entity.ToTable("choices");

    entity.Property(e => e.IsCorrect)
        .HasDefaultValue(false);

    entity.Property(e => e.OrderIndex)
        .HasDefaultValue(1);

    entity.HasIndex(e => e.QuestionId);

    entity.HasOne(d => d.Question)
        .WithMany(p => p.Choices)
        .HasForeignKey(d => d.QuestionId)
        .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<QuestionMedia>(entity =>
{
    entity.ToTable("question_media");

    entity.Property(e => e.MediaType)
        .HasConversion<string>();

    entity.Property(e => e.OrderIndex)
        .HasDefaultValue(1);

    entity.HasIndex(e => new { e.QuestionId, e.OrderIndex });

    entity.HasOne(e => e.Question)
        .WithMany(q => q.Media)
        .HasForeignKey(e => e.QuestionId)
        .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<QuestionErrorRegion>(entity =>
{
    entity.ToTable("question_error_regions");

    entity.Property(e => e.Points)
        .HasDefaultValue(1.00m);

    entity.HasIndex(e => e.QuestionId);

    entity.HasOne(e => e.Question)
        .WithMany(q => q.ErrorRegions)
        .HasForeignKey(e => e.QuestionId)
        .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<QuestionAnnotation>(entity =>
{
    entity.ToTable("question_annotations");

    entity.Property(e => e.AnnotationType)
        .HasConversion<string>();

    entity.Property(e => e.Points)
        .HasDefaultValue(1.00m);

    entity.HasIndex(e => e.QuestionId);

    entity.HasOne(e => e.Question)
        .WithMany(q => q.Annotations)
        .HasForeignKey(e => e.QuestionId)
        .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<QuestionArrangeItem>(entity =>
{
    entity.ToTable("question_arrange_items");

    entity.Property(e => e.IsDistractor)
        .HasDefaultValue(false);

    entity.HasIndex(e => e.QuestionId);

    entity.HasOne(e => e.Question)
        .WithMany(q => q.ArrangeItems)
        .HasForeignKey(e => e.QuestionId)
        .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<QuestionWritingConfig>(entity =>
{
    entity.ToTable("question_writing_configs");

    entity.HasIndex(e => e.QuestionId)
        .IsUnique();

    entity.HasOne(e => e.Question)
        .WithOne(q => q.WritingConfig)
        .HasForeignKey<QuestionWritingConfig>(e => e.QuestionId)
        .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<ScenarioNode>(entity =>
{
    entity.ToTable("scenario_nodes");

    entity.Property(e => e.NodeType)
        .HasConversion<string>();

    entity.Property(e => e.IsStartNode)
        .HasDefaultValue(false);

    entity.Property(e => e.IsEndNode)
        .HasDefaultValue(false);

    entity.HasIndex(e => e.QuestionId);

    entity.HasOne(e => e.Question)
        .WithMany(q => q.ScenarioNodes)
        .HasForeignKey(e => e.QuestionId)
        .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<ScenarioChoice>(entity =>
{
    entity.ToTable("scenario_choices");

    entity.Property(e => e.Score)
        .HasDefaultValue(0m);

    entity.Property(e => e.OrderIndex)
        .HasDefaultValue(1);

    entity.HasIndex(e => e.NodeId);
    entity.HasIndex(e => e.NextNodeId);

    entity.HasOne(e => e.Node)
        .WithMany(n => n.Choices)
        .HasForeignKey(e => e.NodeId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(e => e.NextNode)
        .WithMany(n => n.IncomingChoices)
        .HasForeignKey(e => e.NextNodeId)
        .OnDelete(DeleteBehavior.Restrict);
});

modelBuilder.Entity<QuizAttempt>(entity =>
{
    entity.ToTable("quiz_attempts");

    entity.Property(e => e.AttemptNumber)
        .HasDefaultValue(1);

    entity.Property(e => e.ResultStatus)
        .HasConversion<string>();

    entity.Property(e => e.StartedAt)
        .HasDefaultValueSql("CURRENT_TIMESTAMP");

    entity.HasIndex(e => new { e.QuizId, e.UserId });

    entity.HasOne(d => d.Quiz)
        .WithMany(p => p.QuizAttempts)
        .HasForeignKey(d => d.QuizId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(d => d.User)
        .WithMany(p => p.QuizAttempts)
        .HasForeignKey(d => d.UserId)
        .OnDelete(DeleteBehavior.Cascade);
});

modelBuilder.Entity<QuizAnswer>(entity =>
{
    entity.ToTable("quiz_answers");

    entity.Property(e => e.MaxScore)
        .HasDefaultValue(1.00m);

    entity.Property(e => e.AnsweredAt)
        .HasDefaultValueSql("CURRENT_TIMESTAMP");

    entity.HasIndex(e => new { e.AttemptId, e.QuestionId })
        .IsUnique();

    entity.HasOne(d => d.Attempt)
        .WithMany(p => p.QuizAnswers)
        .HasForeignKey(d => d.AttemptId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(d => d.Question)
        .WithMany(p => p.QuizAnswers)
        .HasForeignKey(d => d.QuestionId)
        .OnDelete(DeleteBehavior.Restrict);

    // Legacy SelectedChoiceID: giữ tương thích dữ liệu cũ.
    entity.HasOne(d => d.SelectedChoice)
        .WithMany(p => p.QuizAnswers)
        .HasForeignKey(d => d.SelectedChoiceId)
        .OnDelete(DeleteBehavior.SetNull);

    entity.HasOne(d => d.GradedBy)
        .WithMany()
        .HasForeignKey(d => d.GradedById)
        .OnDelete(DeleteBehavior.Restrict);
});

modelBuilder.Entity<QuizAnswerSelectedChoice>(entity =>
{
    entity.ToTable("quiz_answer_selected_choices");

    entity.HasIndex(e => new { e.QuizAnswerId, e.ChoiceId })
        .IsUnique();

    entity.HasOne(e => e.QuizAnswer)
        .WithMany(a => a.SelectedChoices)
        .HasForeignKey(e => e.QuizAnswerId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(e => e.Choice)
        .WithMany(c => c.SelectedByAnswers)
        .HasForeignKey(e => e.ChoiceId)
        .OnDelete(DeleteBehavior.Restrict);
});

modelBuilder.Entity<QuizAnswerErrorRegion>(entity =>
{
    entity.ToTable("quiz_answer_error_regions");

    entity.HasIndex(e => e.QuizAnswerId);

    entity.HasOne(e => e.QuizAnswer)
        .WithMany(a => a.ErrorRegions)
        .HasForeignKey(e => e.QuizAnswerId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(e => e.MatchedErrorRegion)
        .WithMany(r => r.AnswerErrorRegions)
        .HasForeignKey(e => e.MatchedErrorRegionId)
        .OnDelete(DeleteBehavior.SetNull);
});

modelBuilder.Entity<QuizAnswerAnnotation>(entity =>
{
    entity.ToTable("quiz_answer_annotations");

    entity.Property(e => e.AnnotationType)
        .HasConversion<string>();

    entity.HasIndex(e => e.QuizAnswerId);

    entity.HasOne(e => e.QuizAnswer)
        .WithMany(a => a.Annotations)
        .HasForeignKey(e => e.QuizAnswerId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(e => e.MatchedAnnotation)
        .WithMany(a => a.AnswerAnnotations)
        .HasForeignKey(e => e.MatchedAnnotationId)
        .OnDelete(DeleteBehavior.SetNull);
});

modelBuilder.Entity<QuizAnswerArrangeItem>(entity =>
{
    entity.ToTable("quiz_answer_arrange_items");

    entity.HasIndex(e => new { e.QuizAnswerId, e.ArrangeItemId })
        .IsUnique();

    entity.HasOne(e => e.QuizAnswer)
        .WithMany(a => a.ArrangeItems)
        .HasForeignKey(e => e.QuizAnswerId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(e => e.ArrangeItem)
        .WithMany(i => i.AnswerArrangeItems)
        .HasForeignKey(e => e.ArrangeItemId)
        .OnDelete(DeleteBehavior.Restrict);
});

modelBuilder.Entity<QuizAnswerScenarioPath>(entity =>
{
    entity.ToTable("quiz_answer_scenario_paths");

    entity.HasIndex(e => new { e.QuizAnswerId, e.StepOrder })
        .IsUnique();

    entity.HasOne(e => e.QuizAnswer)
        .WithMany(a => a.ScenarioPaths)
        .HasForeignKey(e => e.QuizAnswerId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne(e => e.Node)
        .WithMany(n => n.AnswerPaths)
        .HasForeignKey(e => e.NodeId)
        .OnDelete(DeleteBehavior.Restrict);

    entity.HasOne(e => e.ScenarioChoice)
        .WithMany(c => c.AnswerPaths)
        .HasForeignKey(e => e.ScenarioChoiceId)
        .OnDelete(DeleteBehavior.Restrict);
});

        // ============================================================
        // Section 6: Forum Configuration
        // ============================================================

        modelBuilder.Entity<ForumTopic>(entity =>
        {
            entity.ToTable("forum_topics");
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Status).HasDefaultValue("ACTIVE");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<ForumPost>(entity =>
        {
            entity.ToTable("forum_posts");
            entity.HasIndex(e => e.TopicId);
            entity.HasIndex(e => e.AuthorId);
            entity.HasIndex(e => e.Status);
            entity.Property(e => e.Status).HasDefaultValue("PUBLISHED");
            entity.Property(e => e.ViewsCount).HasDefaultValue(0);
            entity.Property(e => e.ReactionsCount).HasDefaultValue(0);
            entity.Property(e => e.CommentsCount).HasDefaultValue(0);
            entity.Property(e => e.ReportsCount).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Topic)
                .WithMany(p => p.Posts)
                .HasForeignKey(d => d.TopicId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Author)
                .WithMany()
                .HasForeignKey(d => d.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ForumComment>(entity =>
        {
            entity.ToTable("forum_comments");
            entity.HasIndex(e => e.PostId);
            entity.HasIndex(e => e.AuthorId);
            entity.HasIndex(e => e.ParentCommentId);
            entity.HasIndex(e => e.Status);
            entity.Property(e => e.DepthLevel).HasDefaultValue(1);
            entity.Property(e => e.IsAnonymous).HasDefaultValue(false);
            entity.Property(e => e.Status).HasDefaultValue("ACTIVE");
            entity.Property(e => e.ReactionsCount).HasDefaultValue(0);
            entity.Property(e => e.ReportsCount).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Post)
                .WithMany(p => p.Comments)
                .HasForeignKey(d => d.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Author)
                .WithMany()
                .HasForeignKey(d => d.AuthorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.ParentComment)
                .WithMany(p => p.Replies)
                .HasForeignKey(d => d.ParentCommentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ForumReaction>(entity =>
        {
            entity.ToTable("forum_reactions");
            entity.HasIndex(e => new { e.UserId, e.TargetType, e.PostId, e.CommentId }).IsUnique();
            entity.Property(e => e.ReactionType).HasDefaultValue("LIKE");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Post)
                .WithMany(p => p.Reactions)
                .HasForeignKey(d => d.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Comment)
                .WithMany(p => p.Reactions)
                .HasForeignKey(d => d.CommentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // AI PRACTICE: cấu hình mới, không chỉnh sửa AIPronunciationFeedback
        modelBuilder.Entity<AIPracticeSession>(e =>
        {
            e.ToTable("ai_practice_sessions");
            e.HasKey(x => x.PracticeSessionId);
            e.HasIndex(x => new { x.LearnerId, x.CreatedAt });
            e.HasIndex(x => new { x.CourseId, x.LessonId, x.CreatedAt });
            e.HasOne<User>().WithMany().HasForeignKey(x => x.LearnerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Course>().WithMany().HasForeignKey(x => x.CourseId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne<Lesson>().WithMany().HasForeignKey(x => x.LessonId).OnDelete(DeleteBehavior.Restrict);
        });
        modelBuilder.Entity<AIPracticeFeedback>(e =>
        {
            e.ToTable("ai_practice_feedbacks");
            e.HasKey(x => x.PracticeFeedbackId);
            e.HasIndex(x => x.PracticeSessionId).IsUnique();
            e.HasOne<AIPracticeSession>().WithMany().HasForeignKey(x => x.PracticeSessionId)
                .OnDelete(DeleteBehavior.Cascade);
            e.HasOne<User>().WithMany().HasForeignKey(x => x.LearnerId)
                .OnDelete(DeleteBehavior.Restrict);
        });
        
        // KHÔNG thay block modelBuilder.Entity<AIPronunciationFeedback> cũ.

        modelBuilder.Entity<AIPronunciationFeedback>(entity =>
{
    entity.ToTable("ai_pronunciation_feedbacks");

    entity.HasKey(e => e.FeedbackId);

    entity.HasIndex(e => new
    {
        e.SubmissionId,
        e.LearnerId
    }).IsUnique();

    entity.Property(e => e.ModelVersion)
        .HasMaxLength(50)
        .IsRequired();

    entity.Property(e => e.LLMProvider)
        .HasMaxLength(100)
        .IsRequired();

    entity.Property(e => e.LLMModel)
        .HasMaxLength(100)
        .IsRequired();

    entity.Property(e => e.PredictionJson)
        .HasColumnType("text");

    entity.Property(e => e.FeedbackJson)
        .HasColumnType("text");

    entity.Property(e => e.Summary)
        .HasColumnType("text");

    entity.Property(e => e.CreatedAt)
        .HasDefaultValueSql("CURRENT_TIMESTAMP");

    entity.Property(e => e.UpdatedAt)
        .HasDefaultValueSql("CURRENT_TIMESTAMP");

    entity.HasOne<SpeakingSubmission>()
        .WithMany()
        .HasForeignKey(e => e.SubmissionId)
        .OnDelete(DeleteBehavior.Cascade);

    entity.HasOne<User>()
        .WithMany()
        .HasForeignKey(e => e.LearnerId)
        .OnDelete(DeleteBehavior.Restrict);
});
        modelBuilder.Entity<ForumReport>(entity =>
        {
            entity.ToTable("forum_reports");
            entity.HasIndex(e => new { e.ReporterId, e.TargetType, e.PostId, e.CommentId }).IsUnique();
            entity.Property(e => e.Status).HasDefaultValue("PENDING");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Reporter)
                .WithMany()
                .HasForeignKey(d => d.ReporterId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.ResolvedBy)
                .WithMany()
                .HasForeignKey(d => d.ResolvedById)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Post)
                .WithMany(p => p.Reports)
                .HasForeignKey(d => d.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Comment)
                .WithMany(p => p.Reports)
                .HasForeignKey(d => d.CommentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
    }

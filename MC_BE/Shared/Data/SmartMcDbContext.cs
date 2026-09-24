using System;
using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Shared.Data;

public class SmartMcDbContext : DbContext
{
    public SmartMcDbContext(DbContextOptions<SmartMcDbContext> options) : base(options)
    {
    }

    // Section 1: Auth & User
    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<UserProfile> UserProfiles { get; set; } = null!;
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

    // Section 2: Course & Learning
    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Course> Courses { get; set; } = null!;
    public DbSet<Module> Modules { get; set; } = null!;
    public DbSet<Lesson> Lessons { get; set; } = null!;
    public DbSet<CourseMaterial> CourseMaterials { get; set; } = null!;
    public DbSet<Enrollment> Enrollments { get; set; } = null!;
    public DbSet<LessonProgress> LessonProgresses { get; set; } = null!;
    public DbSet<Certificate> Certificates { get; set; } = null!;
    public DbSet<SpeakingSubmission> SpeakingSubmissions { get; set; } = null!;

    // Section 3: Payment
    public DbSet<Payment> Payments { get; set; } = null!;
    public DbSet<PaymentTransaction> PaymentTransactions { get; set; } = null!;

    // Section 4: Quiz & Assessment
    public DbSet<Quiz> Quizzes { get; set; } = null!;
    public DbSet<Question> Questions { get; set; } = null!;
    public DbSet<Choice> Choices { get; set; } = null!;
    public DbSet<QuizAttempt> QuizAttempts { get; set; } = null!;
    public DbSet<QuizAnswer> QuizAnswers { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Section 1: Auth & User
        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");
            entity.HasIndex(e => e.RoleName).IsUnique();
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Status).HasDefaultValue("ACTIVE");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Role)
                .WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("user_profiles");
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.PreferredLanguage).HasDefaultValue("en");

            entity.HasOne(d => d.User)
                .WithOne(p => p.UserProfile)
                .HasForeignKey<UserProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.ToTable("password_reset_tokens");
            entity.HasIndex(e => e.Token);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");
            entity.HasIndex(e => e.Token);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany(p => p.RefreshTokens)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Section 2: Course & Learning
        modelBuilder.Entity<Category>(entity =>
        {
            entity.ToTable("categories"); // Ghi đè tên bảng chữ thường tương thích Postgres
            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(CategoryStatus.ACTIVE);
        });

        modelBuilder.Entity<Course>(entity =>
        {
            // GHI ĐÈ [Table("COURSE")]: Chỉ định chính xác bảng trong PostgreSQL
            entity.ToTable("courses");
            entity.HasKey(e => e.CourseId);
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Price).HasDefaultValue(0.00m);
            entity.Property(e => e.Level).HasConversion<string>();
            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(CourseStatus.DRAFT);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Category)
                .WithMany(p => p.Courses)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(d => d.Instructor)
                .WithMany(p => p.InstructedCourses)
                .HasForeignKey(d => d.InstructorId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Module>(entity =>
        {
            entity.ToTable("modules");
            entity.Property(e => e.OrderIndex).HasDefaultValue(1);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Course)
                .WithMany(p => p.Modules)
                .HasForeignKey(d => d.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.ToTable("lessons");
            entity.Property(e => e.LessonType).HasConversion<string>();
            entity.Property(e => e.OrderIndex).HasDefaultValue(1);
            entity.Property(e => e.DurationMinutes).HasDefaultValue(0);
            entity.Property(e => e.IsPreview).HasDefaultValue(false);
            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(LessonStatus.ACTIVE);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

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
            entity.Property(e => e.MaterialType).HasConversion<string>();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

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

        // ENROLLMENT CONFIGURATION
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

            entity.HasIndex(e => e.PaymentId);
            entity.Property(e => e.Status).HasDefaultValue("PENDING_PAYMENT");
            entity.Property(e => e.CompletionPercentage).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Learner)
                .WithMany("Enrollments")
                .HasForeignKey(e => e.LearnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Course)
                .WithMany(c => c.Enrollments)
                .HasForeignKey(e => e.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Payment)
                .WithOne(p => p.Enrollment)
                .HasForeignKey<Payment>(p => p.EnrollmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<LessonProgress>(entity =>
        {
            entity.ToTable("lesson_progresses");
            entity.HasIndex(e => new { e.EnrollmentId, e.LessonId }).IsUnique();
            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(LessonProgressStatus.NOT_STARTED);
            entity.Property(e => e.TimeSpentMinutes).HasDefaultValue(0);

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
            entity.HasIndex(e => e.CertificateCode).IsUnique();
            entity.HasIndex(e => e.EnrollmentId).IsUnique();
            entity.Property(e => e.CompletionPercentage).HasDefaultValue(100.00m);
            entity.Property(e => e.Status).HasDefaultValue("ACTIVE");
            entity.Property(e => e.IssuedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Enrollment)
                .WithMany()
                .HasForeignKey(d => d.EnrollmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SpeakingSubmission>(entity =>
        {
            entity.ToTable("speaking_submissions");
            entity.HasKey(e => e.SubmissionId);

            entity.HasIndex(e => new { e.LearnerId, e.LessonId });
            entity.HasIndex(e => e.Status);

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(SpeakingSubmissionStatus.SUBMITTED);

            entity.Property(e => e.SubmittedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Lesson)
                .WithMany()
                .HasForeignKey(d => d.LessonId)
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
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("payments");

            entity.HasKey(e => e.PaymentId);

            entity.HasIndex(e => e.MerchantTxnRef).IsUnique();
            entity.HasIndex(e => e.LearnerId);
            entity.HasIndex(e => e.CourseId);
            entity.HasIndex(e => e.EnrollmentId);
            entity.HasIndex(e => e.Status);

            entity.Property(e => e.Currency).HasDefaultValue("VND");
            entity.Property(e => e.PaymentMethod).HasDefaultValue("VNPAY");
            entity.Property(e => e.Status).HasDefaultValue("PENDING");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Learner)
                .WithMany("Payments")
                .HasForeignKey(e => e.LearnerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Course)
                .WithMany()
                .HasForeignKey(e => e.CourseId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(e => e.Enrollment)
                .WithOne(en => en.Payment)
                .HasForeignKey<Payment>(p => p.EnrollmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // PAYMENT_TRANSACTION CONFIGURATION
        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.ToTable("payment_transactions");

            entity.HasKey(e => e.TransactionId);

            entity.Property(e => e.TransactionId).HasColumnName("TransactionID");
            entity.Property(e => e.PaymentId).HasColumnName("PaymentID");
            entity.Property(e => e.Provider).HasColumnName("Provider").HasDefaultValue("VNPAY");
            entity.Property(e => e.ProviderTransactionNo).HasColumnName("ProviderTransactionNo");
            entity.Property(e => e.ResponseCode).HasColumnName("ResponseCode");
            entity.Property(e => e.TransactionStatus).HasColumnName("TransactionStatus");
            entity.Property(e => e.BankCode).HasColumnName("BankCode");
            entity.Property(e => e.Amount).HasColumnName("Amount");
            entity.Property(e => e.Status).HasColumnName("Status").HasDefaultValue("PENDING");
            entity.Property(e => e.SignatureValid).HasColumnName("SignatureValid");
            entity.Property(e => e.ProcessedAt).HasColumnName("ProcessedAt");
            entity.Property(e => e.CreatedAt).HasColumnName("CreatedAt").HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasIndex(e => e.PaymentId);
            entity.HasIndex(e => e.ProviderTransactionNo);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Payment)
                .WithMany(p => p.Transactions)
                .HasForeignKey(e => e.PaymentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Section 4: Quiz & Assessment Configuration
        modelBuilder.Entity<Quiz>(entity =>
        {
            entity.ToTable("quizzes");
            entity.Property(e => e.TimeLimitMinutes).HasDefaultValue(0);
            entity.Property(e => e.PassingScore).HasDefaultValue(80.00m);
            entity.Property(e => e.MaxAttempts).HasDefaultValue(1);
            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(QuizStatus.ACTIVE);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

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
            entity.Property(e => e.QuestionType).HasConversion<string>();
            entity.Property(e => e.OrderIndex).HasDefaultValue(1);

            entity.HasOne(d => d.Quiz)
                .WithMany(p => p.Questions)
                .HasForeignKey(d => d.QuizId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Choice>(entity =>
        {
            entity.ToTable("choices");
            entity.Property(e => e.IsCorrect).HasDefaultValue(false);
            entity.Property(e => e.OrderIndex).HasDefaultValue(1);

            entity.HasOne(d => d.Question)
                .WithMany(p => p.Choices)
                .HasForeignKey(d => d.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizAttempt>(entity =>
        {
            entity.ToTable("quiz_attempts");
            entity.Property(e => e.AttemptNumber).HasDefaultValue(1);
            entity.Property(e => e.ResultStatus).HasConversion<string>();
            entity.Property(e => e.StartedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

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
            entity.Property(e => e.AnsweredAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Attempt)
                .WithMany(p => p.QuizAnswers)
                .HasForeignKey(d => d.AttemptId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Question)
                .WithMany(p => p.QuizAnswers)
                .HasForeignKey(d => d.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.SelectedChoice)
                .WithMany(p => p.QuizAnswers)
                .HasForeignKey(d => d.SelectedChoiceId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
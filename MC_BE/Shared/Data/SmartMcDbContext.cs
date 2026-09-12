using MC_BE.Core.Entities;
using MC_BE.Core.Enums;
using Microsoft.EntityFrameworkCore;

namespace MC_BE.Shared.Data;

public class SmartMcDbContext : DbContext
{
    public SmartMcDbContext(DbContextOptions<SmartMcDbContext> options) : base(options)
    {
    }

    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<UserProfile> UserProfiles { get; set; } = null!;
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

    // Section 2: Course & Learning
    public DbSet<Category> Categories { get; set; } = null!;
    public DbSet<Course> Courses { get; set; } = null!;
    public DbSet<Lesson> Lessons { get; set; } = null!;
    public DbSet<CourseMaterial> CourseMaterials { get; set; } = null!;
    public DbSet<Enrollment> Enrollments { get; set; } = null!;
    public DbSet<LessonProgress> LessonProgresses { get; set; } = null!;

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

        // Role configuration
        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasIndex(e => e.RoleName).IsUnique();
        });

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.Status).HasDefaultValue("ACTIVE");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Role)
                .WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // UserProfile configuration
        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique();
            entity.Property(e => e.PreferredLanguage).HasDefaultValue("en");

            entity.HasOne(d => d.User)
                .WithOne(p => p.UserProfile)
                .HasForeignKey<UserProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // PasswordResetToken configuration
        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasIndex(e => e.Token);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // RefreshToken configuration
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasIndex(e => e.Token);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany(p => p.RefreshTokens)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================================================
        // Section 2: Course & Learning Configuration
        // =========================================================
        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(CategoryStatus.ACTIVE);
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.HasIndex(e => e.Slug).IsUnique();

            entity.Property(e => e.Price).HasDefaultValue(0.00m);

            entity.Property(e => e.Level)
                .HasConversion<string>();

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

        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.Property(e => e.LessonType)
                .HasConversion<string>();

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
        });

        modelBuilder.Entity<CourseMaterial>(entity =>
        {
            entity.Property(e => e.MaterialType)
                .HasConversion<string>();

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

        modelBuilder.Entity<Enrollment>(entity =>
        {
            entity.HasIndex(e => new { e.UserId, e.CourseId }).IsUnique();

            entity.Property(e => e.EnrollmentDate).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.Status)
                .HasConversion<string>()
                .HasDefaultValue(EnrollmentStatus.ACTIVE);

            entity.Property(e => e.ProgressPercent).HasDefaultValue(0.00m);

            entity.HasOne(d => d.User)
                .WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Course)
                .WithMany(p => p.Enrollments)
                .HasForeignKey(d => d.CourseId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LessonProgress>(entity =>
        {
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

        // =========================================================
        // Section 3: Payment Configuration
        // =========================================================
        modelBuilder.Entity<Payment>(entity =>
        {
            entity.Property(e => e.PaymentMethod)
                .HasConversion<string>();

            entity.Property(e => e.PaymentStatus)
                .HasConversion<string>()
                .HasDefaultValue(PaymentStatus.PENDING);

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany(p => p.Payments)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(d => d.Enrollment)
                .WithMany(p => p.Payments)
                .HasForeignKey(d => d.EnrollmentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.Property(e => e.TransactionStatus)
                .HasConversion<string>()
                .HasDefaultValue(TransactionStatus.PENDING);

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Payment)
                .WithMany(p => p.Transactions)
                .HasForeignKey(d => d.PaymentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================================================
        // Section 4: Quiz & Assessment Configuration
        // =========================================================
        modelBuilder.Entity<Quiz>(entity =>
        {
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
            entity.Property(e => e.QuestionType)
                .HasConversion<string>();

            entity.Property(e => e.OrderIndex).HasDefaultValue(1);

            entity.HasOne(d => d.Quiz)
                .WithMany(p => p.Questions)
                .HasForeignKey(d => d.QuizId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Choice>(entity =>
        {
            entity.Property(e => e.IsCorrect).HasDefaultValue(false);
            entity.Property(e => e.OrderIndex).HasDefaultValue(1);

            entity.HasOne(d => d.Question)
                .WithMany(p => p.Choices)
                .HasForeignKey(d => d.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<QuizAttempt>(entity =>
        {
            entity.Property(e => e.AttemptNumber).HasDefaultValue(1);

            entity.Property(e => e.ResultStatus)
                .HasConversion<string>();

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

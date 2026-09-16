using Microsoft.EntityFrameworkCore;
using MC_BE.Models.Entities;

namespace MC_BE.Data;

public class SmartMcDbContext : DbContext
{
    public SmartMcDbContext(DbContextOptions<SmartMcDbContext> options)
        : base(options)
    {
    }

    // =========================
    // AUTHENTICATION / PROFILE
    // =========================
    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<UserProfile> UserProfiles { get; set; } = null!;
    public DbSet<PasswordResetToken> PasswordResetTokens { get; set; } = null!;
    public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;

    // =========================
    // ENROLLMENT & PAYMENT
    // =========================
    public DbSet<Enrollment> Enrollments { get; set; } = null!;
    public DbSet<Payment> Payments { get; set; } = null!;
    public DbSet<PaymentTransaction> PaymentTransactions { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // =========================
        // ROLE CONFIGURATION
        // =========================
        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasIndex(e => e.RoleName)
                .IsUnique();
        });

        // =========================
        // USER CONFIGURATION
        // =========================
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email)
                .IsUnique();

            // Default value for Status
            entity.Property(e => e.Status)
                .HasDefaultValue("ACTIVE");

            // Default timestamps
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // User -> Role
            entity.HasOne(d => d.Role)
                .WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // =========================
        // USER PROFILE CONFIGURATION
        // =========================
        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.HasIndex(e => e.UserId)
                .IsUnique();

            entity.Property(e => e.PreferredLanguage)
                .HasDefaultValue("en");

            // 1-to-1 UserProfile -> User
            entity.HasOne(d => d.User)
                .WithOne(p => p.UserProfile)
                .HasForeignKey<UserProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // PASSWORD RESET TOKEN
        // =========================
        modelBuilder.Entity<PasswordResetToken>(entity =>
        {
            entity.HasIndex(e => e.Token);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // =========================
        // REFRESH TOKEN
        // =========================
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasIndex(e => e.Token);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.User)
                .WithMany(p => p.RefreshTokens)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ==========================================================
        // ENROLLMENT CONFIGURATION
        // ==========================================================
        modelBuilder.Entity<Enrollment>(entity =>
        {
            // Prevent unnecessary duplicate lookup cost.
            entity.HasIndex(e => new
            {
                e.LearnerId,
                e.CourseId,
                e.Status
            });

            entity.HasIndex(e => e.PaymentId);

            // Default enrollment status
            entity.Property(e => e.Status)
                .HasDefaultValue("PENDING_PAYMENT");

            entity.Property(e => e.CompletionPercentage)
                .HasDefaultValue(0);

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Enrollment -> Learner(User)
            entity.HasOne(e => e.Learner)
                .WithMany()
                .HasForeignKey(e => e.LearnerId)
                .OnDelete(DeleteBehavior.Restrict);

            /*
             * IMPORTANT:
             *
             * Chưa tạo FK Enrollment -> Course vì Hoàng
             * đang làm Course Management song song.
             *
             * CourseID tạm thời vẫn được lưu bình thường.
             *
             * Sau này có Course entity thì mới thêm:
             *
             * entity.HasOne(e => e.Course)
             *     .WithMany(c => c.Enrollments)
             *     .HasForeignKey(e => e.CourseId);
             */
        });

        // ==========================================================
        // PAYMENT CONFIGURATION
        // ==========================================================
        modelBuilder.Entity<Payment>(entity =>
        {
            // Merchant transaction reference must be unique.
            entity.HasIndex(e => e.MerchantTxnRef)
                .IsUnique();

            entity.HasIndex(e => e.LearnerId);

            entity.HasIndex(e => e.CourseId);

            entity.HasIndex(e => e.EnrollmentId);

            entity.HasIndex(e => e.Status);

            entity.Property(e => e.Currency)
                .HasDefaultValue("VND");

            entity.Property(e => e.PaymentMethod)
                .HasDefaultValue("VNPAY");

            entity.Property(e => e.Status)
                .HasDefaultValue("PENDING");

            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Payment -> Learner(User)
            entity.HasOne(e => e.Learner)
                .WithMany()
                .HasForeignKey(e => e.LearnerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Payment -> Enrollment
            entity.HasOne(e => e.Enrollment)
                .WithMany()
                .HasForeignKey(e => e.EnrollmentId)
                .OnDelete(DeleteBehavior.Restrict);

            /*
             * Không tạo Payment -> Course foreign key lúc này
             * vì Course entity chưa được merge từ phần của Hoàng.
             */
        });

        // ==========================================================
        // PAYMENT TRANSACTION CONFIGURATION
        // ==========================================================
        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.HasIndex(e => e.PaymentId);

            entity.HasIndex(e => e.ProviderTransactionNo);

            entity.HasIndex(e => e.Status);

            entity.Property(e => e.Provider)
                .HasDefaultValue("VNPAY");

            entity.Property(e => e.Status)
                .HasDefaultValue("PENDING");

            // PaymentTransaction -> Payment
            entity.HasOne(e => e.Payment)
                .WithMany(p => p.Transactions)
                .HasForeignKey(e => e.PaymentId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
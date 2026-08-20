using Microsoft.EntityFrameworkCore;
using MC_BE.Models.Entities;

namespace MC_BE.Data;

public class SmartMcDbContext : DbContext
{
    public SmartMcDbContext(DbContextOptions<SmartMcDbContext> options) : base(options)
    {
    }

    public DbSet<Role> Roles { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<UserProfile> UserProfiles { get; set; } = null!;

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

            // Set default value for Status
            entity.Property(e => e.Status)
                .HasDefaultValue("ACTIVE");

            // Set default value for CreatedAt and UpdatedAt
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Relationship User -> Role
            entity.HasOne(d => d.Role)
                .WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // UserProfile configuration
        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.HasIndex(e => e.UserId).IsUnique();

            // Set default value for PreferredLanguage
            entity.Property(e => e.PreferredLanguage)
                .HasDefaultValue("en");

            // 1-to-1 Relationship UserProfile -> User
            entity.HasOne(d => d.User)
                .WithOne(p => p.UserProfile)
                .HasForeignKey<UserProfile>(d => d.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}

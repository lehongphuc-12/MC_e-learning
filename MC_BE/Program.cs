using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using MC_BE.Core.Entities;
using MC_BE.Features.Admin.Services;
using MC_BE.Features.Admin.Services.Interfaces;
using MC_BE.Features.Auth.Services;
using MC_BE.Features.Auth.Services.Interfaces;
using MC_BE.Features.Courses.Services;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Users.Services;
using MC_BE.Features.Users.Services.Interfaces;
using MC_BE.Shared.Data;
using MC_BE.Shared.Middleware;
using MC_BE.Shared.Repositories;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Shared.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
// 08.Quiz Management
using MC_BE.Features.Quizzes.Services;
using MC_BE.Features.Quizzes.Services.Interfaces;
using MC_BE.Features.Learning.Services;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Features.Forum.Services;
using MC_BE.Features.Forum.Services.Interfaces;

var builder = WebApplication.CreateBuilder(args);

// Add DbContext
builder.Services.AddDbContext<SmartMcDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Configure Settings
builder.Services.Configure<CloudinarySettings>(builder.Configuration.GetSection("Cloudinary"));
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.Configure<VnPaySettings>(builder.Configuration.GetSection("VnPay"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddHttpContextAccessor();

// Register Auth, User, Admin & Profile Services
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserProfileService, UserProfileService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IAdminStatsService, AdminStatsService>();

// Course Management Services
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IModuleService, ModuleService>();
builder.Services.AddScoped<ILessonService, LessonService>();

// 08.Quiz Management Services
builder.Services.AddScoped<IQuizService, QuizService>();

// Learning & Certification Services
builder.Services.AddScoped<ICertificateService, CertificateService>();
builder.Services.AddScoped<ILearningProgressService, LearningProgressService>();

// Forum Services
builder.Services.AddScoped<IForumPostService, ForumPostService>();
builder.Services.AddScoped<IForumCommentService, ForumCommentService>();
builder.Services.AddScoped<IForumInteractionService, ForumInteractionService>();
builder.Services.AddScoped<IAdminForumService, AdminForumService>();

// Register Email & Cloudinary Services
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();

// Register Course Enrollment & Payment Services
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<ICourseCatalogService, CourseCatalogService>();
builder.Services.AddScoped<IEnrollmentService, EnrollmentService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IAdminPaymentService, AdminPaymentService>();
builder.Services.AddHttpClient<IVnPayService, VnPayService>();
builder.Services.AddHostedService<EnrollmentExpirationWorker>();

// Configure JWT Authentication
var secretKey = builder.Configuration["Jwt:Secret"] ?? throw new InvalidOperationException("JWT Secret not found.");
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "MC E-Learning API", Version = "v1" });
    c.CustomSchemaIds(x => x.FullName?.Replace("+", "."));

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header
            },
            new List<string>()
        }
    });
});

var app = builder.Build();

app.UseMiddleware<GlobalExceptionMiddleware>();

// Seed roles
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SmartMcDbContext>();
    try
    {
        context.Database.Migrate();

        // Ensure Forum tables exist in PostgreSQL
        var sql = @"
        CREATE TABLE IF NOT EXISTS forum_topics (
            ""TopicID"" SERIAL PRIMARY KEY,
            ""Name"" VARCHAR(100) NOT NULL,
            ""Slug"" VARCHAR(120) NOT NULL UNIQUE,
            ""Description"" TEXT,
            ""Icon"" VARCHAR(50),
            ""OrderIndex"" INT NOT NULL DEFAULT 1,
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS forum_posts (
            ""PostID"" SERIAL PRIMARY KEY,
            ""TopicID"" INT NOT NULL REFERENCES forum_topics(""TopicID"") ON DELETE RESTRICT,
            ""AuthorID"" INT NOT NULL REFERENCES users(""UserID"") ON DELETE RESTRICT,
            ""Title"" VARCHAR(255) NOT NULL,
            ""Content"" TEXT NOT NULL,
            ""ImageUrl"" TEXT,
            ""ViewsCount"" INT NOT NULL DEFAULT 0,
            ""ReactionsCount"" INT NOT NULL DEFAULT 0,
            ""CommentsCount"" INT NOT NULL DEFAULT 0,
            ""ReportsCount"" INT NOT NULL DEFAULT 0,
            ""Status"" VARCHAR(30) NOT NULL DEFAULT 'PUBLISHED',
            ""IsPinned"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""IsLocked"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""RestoredAt"" TIMESTAMP WITH TIME ZONE,
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS ""ImageUrl"" TEXT;
        ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS ""IsAnonymous"" BOOLEAN NOT NULL DEFAULT FALSE;

        CREATE TABLE IF NOT EXISTS forum_comments (
            ""CommentID"" SERIAL PRIMARY KEY,
            ""PostID"" INT NOT NULL REFERENCES forum_posts(""PostID"") ON DELETE CASCADE,
            ""AuthorID"" INT NOT NULL REFERENCES users(""UserID"") ON DELETE RESTRICT,
            ""ParentCommentID"" INT REFERENCES forum_comments(""CommentID"") ON DELETE RESTRICT,
            ""DepthLevel"" INT NOT NULL DEFAULT 1,
            ""Content"" TEXT NOT NULL,
            ""ImageUrl"" TEXT,
            ""IsAnonymous"" BOOLEAN NOT NULL DEFAULT FALSE,
            ""ReactionsCount"" INT NOT NULL DEFAULT 0,
            ""ReportsCount"" INT NOT NULL DEFAULT 0,
            ""Status"" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
            ""RestoredAt"" TIMESTAMP WITH TIME ZONE,
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ""UpdatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        ALTER TABLE forum_comments ADD COLUMN IF NOT EXISTS ""ImageUrl"" TEXT;

        CREATE TABLE IF NOT EXISTS forum_reactions (
            ""ReactionID"" SERIAL PRIMARY KEY,
            ""UserID"" INT NOT NULL REFERENCES users(""UserID"") ON DELETE CASCADE,
            ""TargetType"" VARCHAR(20) NOT NULL DEFAULT 'POST',
            ""PostID"" INT REFERENCES forum_posts(""PostID"") ON DELETE CASCADE,
            ""CommentID"" INT REFERENCES forum_comments(""CommentID"") ON DELETE CASCADE,
            ""ReactionType"" VARCHAR(20) NOT NULL DEFAULT 'LIKE',
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT ""UQ_ForumReactions_UserTarget"" UNIQUE (""UserID"", ""TargetType"", ""PostID"", ""CommentID"")
        );

        CREATE TABLE IF NOT EXISTS forum_reports (
            ""ReportID"" SERIAL PRIMARY KEY,
            ""ReporterID"" INT NOT NULL REFERENCES users(""UserID"") ON DELETE RESTRICT,
            ""TargetType"" VARCHAR(20) NOT NULL DEFAULT 'POST',
            ""PostID"" INT REFERENCES forum_posts(""PostID"") ON DELETE CASCADE,
            ""CommentID"" INT REFERENCES forum_comments(""CommentID"") ON DELETE CASCADE,
            ""Reason"" VARCHAR(50) NOT NULL DEFAULT 'OTHER',
            ""Details"" VARCHAR(500),
            ""Status"" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
            ""CreatedAt"" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            ""ResolvedAt"" TIMESTAMP WITH TIME ZONE,
            ""ResolvedByID"" INT REFERENCES users(""UserID"") ON DELETE RESTRICT,
            CONSTRAINT ""UQ_ForumReports_ReporterTarget"" UNIQUE (""ReporterID"", ""TargetType"", ""PostID"", ""CommentID"")
        );
        ";

        try
        {
            context.Database.ExecuteSqlRaw(sql);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Tự động khởi tạo bảng Forum: {ex.Message}");
        }

        if (!context.ForumTopics.Any())
        {
            context.ForumTopics.AddRange(
                new MC_BE.Core.Entities.ForumTopic { Name = "Thảo luận chung", Slug = "thao-luan-chung", Description = "Trao đổi các chủ đề chung về MC và diễn xuất", Icon = "MessageSquare", OrderIndex = 1 },
                new MC_BE.Core.Entities.ForumTopic { Name = "Kỹ năng & Mẹo MC", Slug = "ky-nang-meo-mc", Description = "Chia sẻ kinh nghiệm làm chủ sân khấu, giọng nói", Icon = "Mic", OrderIndex = 2 },
                new MC_BE.Core.Entities.ForumTopic { Name = "Hỏi đáp khóa học", Slug = "hoi-dap-hoc", Description = "Giải đáp thắc mắc về nội dung các bài học", Icon = "HelpCircle", OrderIndex = 3 },
                new MC_BE.Core.Entities.ForumTopic { Name = "Góc tuyển dụng & Show", Slug = "tuyen-dung-show", Description = "Cơ hội việc làm, tìm bạn đồng hành, tìm show", Icon = "Briefcase", OrderIndex = 4 }
            );
            context.SaveChanges();
        }

        if (!context.Roles.Any())
        {
            context.Roles.AddRange(
                new Role { RoleName = "Learner", Description = "Student user who consumes learning materials." },
                new Role { RoleName = "Instructor", Description = "Teacher user who teaches classes and uploads materials." },
                new Role { RoleName = "Admin", Description = "Administrator user with system-wide permissions." }
            );
            context.SaveChanges();
        }
    }
    catch (Exception)
    {
        // Suppress migration errors
    }
}

app.UseRouting();
app.UseCors("AllowAll");
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// Enable Swagger UI across environments
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "MC E-Learning API v1");
    c.SwaggerEndpoint("v1/swagger.json", "MC E-Learning API v1 (Relative)");
    c.RoutePrefix = "swagger";
});

app.MapControllers();

app.Run();
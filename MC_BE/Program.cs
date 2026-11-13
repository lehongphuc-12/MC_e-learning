using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.RateLimiting;
using MC_BE.Core.Entities;
using MC_BE.Features.Admin.Services;
using MC_BE.Features.Admin.Services.Interfaces;
using MC_BE.Features.Forum.Services;
using MC_BE.Features.Forum.Services.Interfaces;
using MC_BE.Features.Auth.Services;
using MC_BE.Features.Auth.Services.Interfaces;
using MC_BE.Features.Courses.Services;
using MC_BE.Features.Courses.Services.Interfaces;
using MC_BE.Features.Courses.Repositories;
using MC_BE.Features.Courses.Repositories.Interfaces;
using MC_BE.Features.Users.Services;
using MC_BE.Features.Users.Services.Interfaces;
using MC_BE.Features.Learning.Repositories;
using MC_BE.Features.Learning.Repositories.Interfaces;
using MC_BE.Features.Learning.Services;
using MC_BE.Features.Learning.Services.Interfaces;
using MC_BE.Features.Chat.Hubs;
using MC_BE.Features.Chat.Services;
using MC_BE.Features.Chat.Services.Interfaces;
using MC_BE.Features.Quizzes.Services;
using MC_BE.Features.Quizzes.Services.Interfaces;
using MC_BE.Features.Quizzes.Sync;
using MC_BE.Shared.Data;
using MC_BE.Shared.Middleware;
using MC_BE.Shared.Repositories;
using MC_BE.Shared.Repositories.Interfaces;
using MC_BE.Shared.Services;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Shared.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using MC_BE.Features.VoiceAssessment.Services;
using MC_BE.Features.VoiceAssessment.Services.Interfaces;
using MC_BE.Features.VoiceAssessment.Providers;
using MC_BE.Features.VoiceAssessment.Providers.Interfaces;
using Microsoft.Extensions.Options;
var builder = WebApplication.CreateBuilder(args);

// ============================================================
// KESTREL — allow large file uploads (max 500 MB for video)
// ============================================================
builder.WebHost.ConfigureKestrel(options =>
{
    // Per-request limit; individual endpoints can be lower via [RequestSizeLimit]
    options.Limits.MaxRequestBodySize = 500L * 1024L * 1024L; // 500 MB
});
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(options =>
{
    options.ValueLengthLimit = int.MaxValue;
    options.MultipartBodyLengthLimit = 500L * 1024L * 1024L; // 500 MB
    options.MultipartHeadersLengthLimit = int.MaxValue;
});

// ============================================================
// DATABASE
// ============================================================
builder.Services.AddDbContext<SmartMcDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"));
});

// ============================================================
// SETTINGS
// ============================================================
builder.Services.Configure<CloudinarySettings>(builder.Configuration.GetSection("Cloudinary"));
builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.Configure<PayOsSettings>(builder.Configuration.GetSection("PayOS"));
builder.Services.Configure<R2Settings>(builder.Configuration.GetSection("CloudflareR2"));
builder.Services.Configure<GroqSettings>(builder.Configuration.GetSection("Groq"));
builder.Services.Configure<MentorChatSettings>(builder.Configuration.GetSection("MentorChat"));

// ============================================================
// CORS — restrict to known origins only (never wildcard + credentials)
// ============================================================
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>()
    ?? new[] { "http://localhost:3000", "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

// ============================================================
// RATE LIMITING — protect auth endpoints from brute-force / spam
// ============================================================
builder.Services.AddRateLimiter(rateLimiterOptions =>
{
    // Auth endpoints: 10 requests per IP per minute
    rateLimiterOptions.AddFixedWindowLimiter("AuthPolicy", options =>
    {
        options.PermitLimit = 10;
        options.Window = TimeSpan.FromMinutes(1);
        options.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        options.QueueLimit = 0;
    });

    // General API: 200 requests per IP per minute
    rateLimiterOptions.AddFixedWindowLimiter("GeneralPolicy", options =>
    {
        options.PermitLimit = 200;
        options.Window = TimeSpan.FromMinutes(1);
        options.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        options.QueueLimit = 5;
    });

    rateLimiterOptions.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ============================================================
// REPOSITORY / UNIT OF WORK
// ============================================================
builder.Services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddHttpContextAccessor();

// ============================================================
// AUTH / USER / ADMIN
// ============================================================
builder.Services.AddScoped<IPasswordHasher, PasswordHasher>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserProfileService, UserProfileService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IAdminStatsService, AdminStatsService>();

// ============================================================
// COURSE MANAGEMENT
// ============================================================
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddScoped<ICourseMaterialsReadRepository, CourseMaterialsReadRepository>();
builder.Services.AddScoped<ICourseMaterialsReadService, CourseMaterialsReadService>();
builder.Services.AddScoped<ICourseLearningAccessService, CourseLearningAccessService>();
builder.Services.AddScoped<ICourseGiftAccessService, CourseGiftAccessService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IModuleService, ModuleService>();
builder.Services.AddScoped<ILessonService, LessonService>();

// ============================================================
// QUIZ MANAGEMENT
// ============================================================
builder.Services.AddScoped<IQuizService, QuizService>();
builder.Services.AddScoped<QuizSheetReader>();
builder.Services.AddScoped<QuizImportService>();
builder.Services.AddScoped<QuizSheetExporter>();
builder.Services.AddScoped<QuizSyncReviewService>();
builder.Services.AddScoped<QuizSyncSafetyService>();
builder.Services.AddScoped<QuizFullSyncService>();
builder.Services.AddHostedService<QuizAutoSyncWorker>();

// ============================================================
// FORUM
// ============================================================
builder.Services.AddScoped<IForumPostService, ForumPostService>();
builder.Services.AddScoped<IForumCommentService, ForumCommentService>();
builder.Services.AddScoped<IForumInteractionService, ForumInteractionService>();
builder.Services.AddScoped<IAdminForumService, AdminForumService>();

// ============================================================
// LEARNING / CERTIFICATION
// ============================================================
builder.Services.AddScoped<ICertificateService, CertificateService>();
builder.Services.AddScoped<ILearningProgressService, LearningProgressService>();
builder.Services.AddScoped<ILearningAccessService, LearningAccessService>();
builder.Services.AddScoped<ISpeakingSubmissionRepository, SpeakingSubmissionRepository>();
builder.Services.AddScoped<ISpeakingSubmissionService, SpeakingSubmissionService>();
builder.Services.AddScoped<ISpeakingScriptRepository, SpeakingScriptRepository>();
builder.Services.AddScoped<ISpeakingScriptService, SpeakingScriptService>();
builder.Services.AddScoped<SpeakingScriptParserService>();
builder.Services.AddScoped<IBackgroundMusicService, BackgroundMusicService>();

// ============================================================
// EMAIL / CLOUDINARY
// ============================================================
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<IR2StorageService, R2StorageService>();

// ============================================================
// AI SPEECH-TO-TEXT & TRANSCRIPTION
// ============================================================
builder.Services.AddHttpClient<IGroqWhisperService, GroqWhisperService>();
builder.Services.AddHttpClient<IMentorChatService, MentorChatService>();
builder.Services.AddSingleton<IAudioExtractorService, AudioExtractorService>();
builder.Services.AddSingleton<ITranscriptionQueue, TranscriptionQueue>();
builder.Services.AddHostedService<TranscriptionWorker>();
builder.Services.AddHostedService<VideoUploadSessionCleanupWorker>();
builder.Services.AddHostedService<R2ObjectDeletionWorker>();

// ============================================================
// ENROLLMENT / PAYMENT
// ============================================================
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<ICourseCatalogService, CourseCatalogService>();
builder.Services.AddScoped<IEnrollmentService, EnrollmentService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IAdminPaymentService, AdminPaymentService>();
builder.Services.AddScoped<IPayOsService, PayOsService>();
builder.Services.AddHostedService<EnrollmentExpirationWorker>();

// ============================================================
// CHAT / CALL
// ============================================================
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<ICallService, CallService>();
// ============================================================
// Model AI
// ============================================================
builder.Services.Configure<OpenAISettings>(
    builder.Configuration.GetSection("OpenAI"));

builder.Services.Configure<VoiceAssessmentAISettings>(
    builder.Configuration.GetSection("VoiceAssessmentAI"));
// ============================================================
// SIGNALR
// ============================================================
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 128 * 1024;
});

// ============================================================
// JWT AUTHENTICATION
// ============================================================
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
    // SignalR sends JWT through ?access_token=... when using WebSocket.
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) &&
                (path.StartsWithSegments("/hubs/chat") || path.StartsWithSegments("/hubs/call")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// ============================================================
// CONTROLLERS / JSON
// ============================================================
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
// ============================================================
// VOICE ASSESSMENT - AI FEEDBACK
// ============================================================

builder.Services.AddScoped<
    IAIResponseService,
    AIResponseService>();

// AI PRACTICE (bổ sung độc lập, giữ nguyên AIResponseService)
builder.Services.AddScoped<IAIPracticeService, AIPracticeService>();

builder.Services.AddHttpClient<
    ILLMProvider,
    OpenAIProvider>();

builder.Services.AddHttpClient(
    "VoiceAssessmentAI",
    (serviceProvider, client) =>
    {
        var settings = serviceProvider
            .GetRequiredService<
                Microsoft.Extensions.Options.IOptions<VoiceAssessmentAISettings>>()
            .Value;

        if (!Uri.TryCreate(
                settings.BaseUrl,
                UriKind.Absolute,
                out var baseUri) ||
            (baseUri.Scheme != Uri.UriSchemeHttp &&
             baseUri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException(
                "Địa chỉ dịch vụ AI không hợp lệ.");
        }

        if (settings.TimeoutSeconds <= 0)
        {
            throw new InvalidOperationException(
                "Thời gian chờ dịch vụ AI phải lớn hơn 0.");
        }

        client.BaseAddress = new Uri(
            settings.BaseUrl.TrimEnd('/') + "/");

        client.Timeout = TimeSpan.FromSeconds(
            settings.TimeoutSeconds);
    });

builder.Services.AddHttpClient(
    "AudioSource",
    client =>
    {
        client.Timeout = TimeSpan.FromSeconds(60);
    });
// ============================================================
// OPEN API / SWAGGER (always registered so dev tools work; UI gated below)
// ============================================================
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "MC E-Learning API",
        Version = "v1"
    });
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

// ============================================================
// BUILD APP
// ============================================================
var app = builder.Build();

// ============================================================
// GLOBAL EXCEPTION
// ============================================================
app.UseMiddleware<GlobalExceptionMiddleware>();

// ============================================================
// HTTPS REDIRECT — ensure HTTP requests are upgraded to HTTPS
// ============================================================
app.UseHttpsRedirection();

// ============================================================
// DATABASE MIGRATION + PATCH
// ============================================================
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<SmartMcDbContext>();
    try
    {
        // Execute DDL to patch existing Postgres table column types if needed
        context.Database.ExecuteSqlRaw(@"
            ALTER TABLE course_materials ALTER COLUMN ""FileUrl"" TYPE text;
            ALTER TABLE course_materials ALTER COLUMN ""Title"" TYPE character varying(500);
            ALTER TABLE IF EXISTS lessons ADD COLUMN IF NOT EXISTS ""Transcript"" text;
            ALTER TABLE IF EXISTS lessons ADD COLUMN IF NOT EXISTS ""SubtitleUrl"" text;
            ALTER TABLE IF EXISTS lessons ADD COLUMN IF NOT EXISTS ""TranscriptStatus"" integer NOT NULL DEFAULT 0;
            CREATE TABLE IF NOT EXISTS speaking_scripts (
                ""ScriptID"" SERIAL PRIMARY KEY,
                ""CourseID"" integer NOT NULL DEFAULT 0,
                ""ModuleID"" integer,
                ""LessonID"" integer,
                ""Scope"" character varying(20) NOT NULL DEFAULT 'FINAL',
                ""PassingScore"" numeric(5,2) NOT NULL DEFAULT 80.00,
                ""Title"" character varying(500) NOT NULL,
                ""OriginalContent"" text,
                ""CreatedBy"" integer,
                ""UpdatedAt"" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                ""Status"" character varying(20) DEFAULT 'DRAFT',
                CONSTRAINT fk_speaking_scripts_lesson FOREIGN KEY (""LessonID"") REFERENCES lessons(""LessonID"") ON DELETE CASCADE,
                CONSTRAINT fk_speaking_scripts_user FOREIGN KEY (""CreatedBy"") REFERENCES users(""UserID"") ON DELETE SET NULL
            );
            ALTER TABLE IF EXISTS speaking_scripts ADD COLUMN IF NOT EXISTS ""CourseID"" integer NOT NULL DEFAULT 0;
            ALTER TABLE IF EXISTS speaking_scripts ADD COLUMN IF NOT EXISTS ""ModuleID"" integer;
            ALTER TABLE IF EXISTS speaking_scripts ADD COLUMN IF NOT EXISTS ""Scope"" character varying(20) NOT NULL DEFAULT 'FINAL';
            ALTER TABLE IF EXISTS speaking_scripts ADD COLUMN IF NOT EXISTS ""PassingScore"" numeric(5,2) NOT NULL DEFAULT 80.00;
            ALTER TABLE IF EXISTS speaking_scripts ALTER COLUMN ""LessonID"" DROP NOT NULL;
            ALTER TABLE IF EXISTS speaking_submissions ADD COLUMN IF NOT EXISTS ""ScriptID"" integer;
            ALTER TABLE IF EXISTS speaking_submissions ALTER COLUMN ""LessonID"" DROP NOT NULL;
            UPDATE speaking_scripts s SET ""CourseID"" = l.""CourseID"" FROM lessons l WHERE s.""LessonID"" = l.""LessonID"" AND (s.""CourseID"" IS NULL OR s.""CourseID"" = 0);
            UPDATE speaking_submissions sub SET ""ScriptID"" = s.""ScriptID"" FROM speaking_scripts s WHERE sub.""LessonID"" = s.""LessonID"" AND sub.""ScriptID"" IS NULL;
            CREATE TABLE IF NOT EXISTS speaking_script_levels (
                ""LevelID"" SERIAL PRIMARY KEY,
                ""ScriptID"" integer NOT NULL,
                ""Level"" character varying(20) NOT NULL,
                ""Content"" text NOT NULL,
                ""CleanScriptForScoring"" text,
                ""UpdatedAt"" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_speaking_script_levels_script FOREIGN KEY (""ScriptID"") REFERENCES speaking_scripts(""ScriptID"") ON DELETE CASCADE,
                CONSTRAINT uq_script_level UNIQUE (""ScriptID"", ""Level"")
            );
        ");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database column patch notice: {ex.Message}");
    }
}

// ============================================================
// HTTP PIPELINE
// ============================================================
app.UseRouting();
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

// ============================================================
// SIGNALR HUBS
// ============================================================
app.MapHub<ChatHub>("/hubs/chat");
app.MapHub<CallHub>("/hubs/call");

// ============================================================
// SWAGGER — only expose UI in Development environment
// ============================================================
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "MC E-Learning API v1");
        c.RoutePrefix = "swagger";
    });
}

// ============================================================
// CONTROLLERS
// ============================================================
app.MapControllers();

// ============================================================
// RUN
// ============================================================
app.Run();

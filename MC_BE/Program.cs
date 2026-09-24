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
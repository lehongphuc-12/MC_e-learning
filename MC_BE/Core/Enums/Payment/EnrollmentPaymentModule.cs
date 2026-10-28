using MC_BE.Shared.Services;
using MC_BE.Shared.Services.Interfaces;
using MC_BE.Shared.Settings;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MC_BE.Features.EnrollmentPayment;

public static class EnrollmentPaymentModule
{
    public static IServiceCollection AddEnrollmentPayment(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.Configure<PayOsSettings>(
            configuration.GetSection("PayOS"));

        services.AddHttpContextAccessor();

        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<ICourseCatalogService, CourseCatalogService>();
        services.AddScoped<IEnrollmentService, EnrollmentService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IAdminPaymentService, AdminPaymentService>();
        services.AddScoped<IPayOsService, PayOsService>();
        services.AddHostedService<EnrollmentExpirationWorker>();

        return services;
    }
}
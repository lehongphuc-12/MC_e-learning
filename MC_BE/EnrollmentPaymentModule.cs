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
        services.Configure<VnPaySettings>(
            configuration.GetSection("VnPay")
        );

        services.AddHttpContextAccessor();

        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<ICourseCatalogService, MockCourseCatalogService>();
        services.AddScoped<IEnrollmentService, EnrollmentService>();
        services.AddScoped<IPaymentService, PaymentService>();
        services.AddScoped<IAdminPaymentService, AdminPaymentService>();
        services.AddHttpClient<IVnPayService, VnPayService>();
        services.AddHostedService<EnrollmentExpirationWorker>();

        return services;
    }
}
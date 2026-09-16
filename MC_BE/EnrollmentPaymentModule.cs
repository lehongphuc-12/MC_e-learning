using MC_BE.Helpers;
using MC_BE.Services;
using MC_BE.Services.Interfaces;
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

        return services;
    }
}
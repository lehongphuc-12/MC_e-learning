namespace MC_BE.Services.Interfaces;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string body, bool isHtml = true);
}

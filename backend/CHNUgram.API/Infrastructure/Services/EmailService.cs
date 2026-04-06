using System.Net;
using System.Net.Mail;

namespace CHNUgram.API.Infrastructure.Services;

public interface IEmailService
{
    Task SendVerificationEmailAsync(string email, string token);
    Task SendPasswordResetEmailAsync(string email, string token);
}

public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task SendVerificationEmailAsync(string email, string token)
    {
        var frontendUrl = _config["Frontend:Url"] ?? "http://localhost:3000";
        var verificationLink = $"{frontendUrl}/verify-email?token={token}";

        var body = $"""
            <h2>Welcome to CHNUgram!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="{verificationLink}" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
                Verify Email
            </a>
            <p>The link expires in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
            """;

        await SendEmailAsync(email, "Verify your CHNUgram email", body);
    }

    public async Task SendPasswordResetEmailAsync(string email, string token)
    {
        var frontendUrl = _config["Frontend:Url"] ?? "http://localhost:3000";
        var resetLink = $"{frontendUrl}/reset-password?token={token}";

        var body = $"""
            <h2>Password Reset Request</h2>
            <p>Click the link below to reset your password:</p>
            <a href="{resetLink}" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
                Reset Password
            </a>
            <p>The link expires in 1 hour.</p>
            """;

        await SendEmailAsync(email, "Reset your CHNUgram password", body);
    }

    private async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        try
        {
            var smtpHost = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
            var smtpPort = int.Parse(_config["Email:SmtpPort"] ?? "587");
            var smtpUser = _config["Email:Username"] ?? "";
            var smtpPass = _config["Email:Password"] ?? "";
            var fromEmail = _config["Email:From"] ?? "noreply@chnu.edu.ua";

            using var client = new SmtpClient(smtpHost, smtpPort)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(smtpUser, smtpPass)
            };

            var message = new MailMessage
            {
                From = new MailAddress(fromEmail, "CHNUgram"),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            message.To.Add(to);

            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", to);
            // In development, just log the error
        }
    }
}

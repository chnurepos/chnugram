using CHNUgram.API.Common;
using CHNUgram.API.Domain.Entities;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Auth.Commands;

public record RegisterCommand(string Email, string Username, string DisplayName, string Password) : IRequest<AuthResponse>;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponse>
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;
    private readonly IEmailService _email;

    public RegisterCommandHandler(AppDbContext db, IJwtService jwt, IEmailService email)
    {
        _db = db;
        _jwt = jwt;
        _email = email;
    }

    public async Task<AuthResponse> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        if (await _db.Users.AnyAsync(u => u.Email == request.Email.ToLower(), cancellationToken))
            throw new InvalidOperationException("Email is already registered.");

        if (await _db.Users.AnyAsync(u => u.Username == request.Username.ToLower(), cancellationToken))
            throw new InvalidOperationException("Username is already taken.");

        var user = new User
        {
            Email = request.Email.ToLower(),
            Username = request.Username.ToLower(),
            DisplayName = request.DisplayName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);

        var verificationToken = new EmailVerification
        {
            UserId = user.Id,
            Token = Guid.NewGuid().ToString("N") + Guid.NewGuid().ToString("N"),
            ExpiresAt = DateTime.UtcNow.AddHours(24)
        };
        _db.EmailVerifications.Add(verificationToken);

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = _jwt.GenerateRefreshToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        _db.RefreshTokens.Add(refreshToken);

        await _db.SaveChangesAsync(cancellationToken);

        // Send verification email (don't block on it)
        _ = _email.SendVerificationEmailAsync(user.Email, verificationToken.Token);

        var accessToken = _jwt.GenerateAccessToken(user);

        return new AuthResponse(accessToken, refreshToken.Token, user.ToDto(false));
    }
}

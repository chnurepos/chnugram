using CHNUgram.API.Common;
using CHNUgram.API.Domain.Entities;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Auth.Commands;

public record LoginCommand(string Email, string Password) : IRequest<AuthResponse>;

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponse>
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;
    private readonly IRedisService _redis;

    public LoginCommandHandler(AppDbContext db, IJwtService jwt, IRedisService redis)
    {
        _db = db;
        _jwt = jwt;
        _redis = redis;
    }

    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email.ToLower(), cancellationToken);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid email or password.");

        // Create new refresh token
        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = _jwt.GenerateRefreshToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        _db.RefreshTokens.Add(refreshToken);

        user.LastSeenAt = DateTime.UtcNow;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        await _redis.SetUserOnlineAsync(user.Id);

        var accessToken = _jwt.GenerateAccessToken(user);
        return new AuthResponse(accessToken, refreshToken.Token, user.ToDto(true));
    }
}

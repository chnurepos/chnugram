using CHNUgram.API.Common;
using CHNUgram.API.Domain.Entities;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Auth.Commands;

public record RefreshTokenCommand(string Token) : IRequest<AuthResponse>;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, AuthResponse>
{
    private readonly AppDbContext _db;
    private readonly IJwtService _jwt;

    public RefreshTokenCommandHandler(AppDbContext db, IJwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<AuthResponse> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        var existing = await _db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == request.Token, cancellationToken);

        if (existing == null || !existing.IsActive)
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");

        // Revoke old token
        existing.RevokedAt = DateTime.UtcNow;

        // Create new refresh token
        var newRefreshToken = new RefreshToken
        {
            UserId = existing.UserId,
            Token = _jwt.GenerateRefreshToken(),
            ExpiresAt = DateTime.UtcNow.AddDays(30)
        };
        _db.RefreshTokens.Add(newRefreshToken);

        await _db.SaveChangesAsync(cancellationToken);

        var accessToken = _jwt.GenerateAccessToken(existing.User!);
        return new AuthResponse(accessToken, newRefreshToken.Token, existing.User!.ToDto(true));
    }
}

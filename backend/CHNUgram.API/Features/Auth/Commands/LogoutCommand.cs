using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Auth.Commands;

public record LogoutCommand(string RefreshToken, string UserId) : IRequest<bool>;

public class LogoutCommandHandler : IRequestHandler<LogoutCommand, bool>
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;

    public LogoutCommandHandler(AppDbContext db, IRedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    public async Task<bool> Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var token = await _db.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == request.RefreshToken && rt.UserId == request.UserId, cancellationToken);

        if (token != null)
        {
            token.RevokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
        if (user != null)
        {
            user.LastSeenAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(cancellationToken);
        }

        await _redis.SetUserOfflineAsync(request.UserId);

        return true;
    }
}

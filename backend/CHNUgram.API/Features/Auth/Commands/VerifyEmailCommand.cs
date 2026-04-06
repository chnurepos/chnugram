using CHNUgram.API.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Auth.Commands;

public record VerifyEmailCommand(string Token) : IRequest<bool>;

public class VerifyEmailCommandHandler : IRequestHandler<VerifyEmailCommand, bool>
{
    private readonly AppDbContext _db;

    public VerifyEmailCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(VerifyEmailCommand request, CancellationToken cancellationToken)
    {
        var verification = await _db.EmailVerifications
            .Include(ev => ev.User)
            .FirstOrDefaultAsync(ev => ev.Token == request.Token, cancellationToken);

        if (verification == null || verification.IsExpired || verification.IsUsed)
            throw new InvalidOperationException("Invalid or expired verification token.");

        verification.UsedAt = DateTime.UtcNow;
        verification.User!.IsVerified = true;
        verification.User.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

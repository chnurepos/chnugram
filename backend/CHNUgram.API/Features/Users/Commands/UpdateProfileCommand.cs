using CHNUgram.API.Common;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Users.Commands;

public record UpdateProfileCommand(string UserId, string? DisplayName, string? Bio, string? Username) : IRequest<UserDto>;
public record UpdateAvatarCommand(string UserId, IFormFile File) : IRequest<UserDto>;

public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, UserDto>
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;

    public UpdateProfileCommandHandler(AppDbContext db, IRedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    public async Task<UserDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        if (request.Username != null && request.Username != user.Username)
        {
            var taken = await _db.Users.AnyAsync(u => u.Username == request.Username.ToLower() && u.Id != request.UserId, cancellationToken);
            if (taken) throw new InvalidOperationException("Username is already taken.");
            user.Username = request.Username.ToLower();
        }

        if (request.DisplayName != null) user.DisplayName = request.DisplayName;
        if (request.Bio != null) user.Bio = request.Bio;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        var isOnline = await _redis.IsUserOnlineAsync(user.Id);
        return user.ToDto(isOnline);
    }
}

public class UpdateAvatarCommandHandler : IRequestHandler<UpdateAvatarCommand, UserDto>
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _storage;
    private readonly IRedisService _redis;

    public UpdateAvatarCommandHandler(AppDbContext db, IFileStorageService storage, IRedisService redis)
    {
        _db = db;
        _storage = storage;
        _redis = redis;
    }

    public async Task<UserDto> Handle(UpdateAvatarCommand request, CancellationToken cancellationToken)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var (filePath, publicUrl) = await _storage.SaveFileAsync(request.File, "avatars");

        // Delete old avatar
        if (user.AvatarUrl != null)
        {
            try { await _storage.DeleteFileAsync(user.AvatarUrl.Replace(_storage.GetPublicUrl(""), "")); }
            catch { /* ignore */ }
        }

        user.AvatarUrl = publicUrl;
        user.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        var isOnline = await _redis.IsUserOnlineAsync(user.Id);
        return user.ToDto(isOnline);
    }
}

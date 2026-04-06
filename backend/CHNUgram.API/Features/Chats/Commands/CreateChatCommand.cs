using CHNUgram.API.Common;
using CHNUgram.API.Domain.Entities;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Chats.Commands;

public record CreateChatCommand(string CreatorId, string Type, string? Name, string? Description, List<string> MemberIds) : IRequest<ChatDto>;
public record UpdateChatCommand(string ChatId, string UserId, string? Name, string? Description) : IRequest<ChatDto>;
public record DeleteChatCommand(string ChatId, string UserId) : IRequest<bool>;
public record AddMemberCommand(string ChatId, string RequesterId, string UserId, string Role) : IRequest<bool>;
public record RemoveMemberCommand(string ChatId, string RequesterId, string UserId) : IRequest<bool>;

public class CreateChatCommandHandler : IRequestHandler<CreateChatCommand, ChatDto>
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;

    public CreateChatCommandHandler(AppDbContext db, IRedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    public async Task<ChatDto> Handle(CreateChatCommand request, CancellationToken cancellationToken)
    {
        var chatType = Enum.Parse<ChatType>(request.Type, true);

        // For private chats, check if one already exists between these two users
        if (chatType == ChatType.Private)
        {
            if (request.MemberIds.Count != 1)
                throw new InvalidOperationException("Private chat requires exactly one other member.");

            var otherId = request.MemberIds[0];
            var existingPrivate = await _db.ChatMembers
                .Where(cm => cm.UserId == request.CreatorId && cm.LeftAt == null)
                .Select(cm => cm.ChatId)
                .Intersect(
                    _db.ChatMembers
                        .Where(cm => cm.UserId == otherId && cm.LeftAt == null)
                        .Select(cm => cm.ChatId)
                )
                .Join(_db.Chats.Where(c => c.Type == ChatType.Private), id => id, c => c.Id, (id, c) => c.Id)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingPrivate != null)
                throw new InvalidOperationException($"Private chat already exists: {existingPrivate}");
        }

        var chat = new Chat
        {
            Type = chatType,
            Name = chatType == ChatType.Group ? request.Name : null,
            Description = request.Description,
            CreatedBy = request.CreatorId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.Chats.Add(chat);

        // Add creator as owner
        _db.ChatMembers.Add(new ChatMember
        {
            ChatId = chat.Id,
            UserId = request.CreatorId,
            Role = MemberRole.Owner,
            JoinedAt = DateTime.UtcNow
        });

        // Add other members
        foreach (var memberId in request.MemberIds.Distinct().Where(id => id != request.CreatorId))
        {
            _db.ChatMembers.Add(new ChatMember
            {
                ChatId = chat.Id,
                UserId = memberId,
                Role = MemberRole.Member,
                JoinedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        // Reload with members
        var created = await _db.Chats
            .Include(c => c.Members.Where(m => m.LeftAt == null))
                .ThenInclude(m => m.User)
            .FirstAsync(c => c.Id == chat.Id, cancellationToken);

        var memberDtos = new List<ChatMemberDto>();
        foreach (var member in created.Members)
        {
            var isOnline = await _redis.IsUserOnlineAsync(member.UserId);
            memberDtos.Add(new ChatMemberDto(
                member.UserId, member.User!.Username, member.User.DisplayName,
                member.User.AvatarUrl, member.Role.ToString().ToLower(), isOnline, member.JoinedAt));
        }

        return new ChatDto(
            created.Id, created.Type.ToString().ToLower(), created.Name, created.Description,
            created.AvatarUrl, created.CreatedBy, created.CreatedAt, memberDtos, null, 0);
    }
}

public class UpdateChatCommandHandler : IRequestHandler<UpdateChatCommand, ChatDto>
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;

    public UpdateChatCommandHandler(AppDbContext db, IRedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    public async Task<ChatDto> Handle(UpdateChatCommand request, CancellationToken cancellationToken)
    {
        var member = await _db.ChatMembers
            .FirstOrDefaultAsync(cm => cm.ChatId == request.ChatId && cm.UserId == request.UserId && cm.LeftAt == null, cancellationToken);

        if (member == null || member.Role == MemberRole.Member)
            throw new UnauthorizedAccessException("Only admins can update chat settings.");

        var chat = await _db.Chats
            .Include(c => c.Members.Where(m => m.LeftAt == null))
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(c => c.Id == request.ChatId, cancellationToken)
            ?? throw new KeyNotFoundException("Chat not found.");

        if (request.Name != null) chat.Name = request.Name;
        if (request.Description != null) chat.Description = request.Description;
        chat.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        var memberDtos = new List<ChatMemberDto>();
        foreach (var m in chat.Members)
        {
            var isOnline = await _redis.IsUserOnlineAsync(m.UserId);
            memberDtos.Add(new ChatMemberDto(
                m.UserId, m.User!.Username, m.User.DisplayName,
                m.User.AvatarUrl, m.Role.ToString().ToLower(), isOnline, m.JoinedAt));
        }

        return new ChatDto(chat.Id, chat.Type.ToString().ToLower(), chat.Name, chat.Description,
            chat.AvatarUrl, chat.CreatedBy, chat.CreatedAt, memberDtos, null, 0);
    }
}

public class DeleteChatCommandHandler : IRequestHandler<DeleteChatCommand, bool>
{
    private readonly AppDbContext _db;

    public DeleteChatCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(DeleteChatCommand request, CancellationToken cancellationToken)
    {
        var member = await _db.ChatMembers
            .FirstOrDefaultAsync(cm => cm.ChatId == request.ChatId && cm.UserId == request.UserId && cm.LeftAt == null, cancellationToken);

        if (member == null || member.Role != MemberRole.Owner)
            throw new UnauthorizedAccessException("Only the owner can delete the chat.");

        var chat = await _db.Chats.FirstOrDefaultAsync(c => c.Id == request.ChatId, cancellationToken)
            ?? throw new KeyNotFoundException("Chat not found.");

        _db.Chats.Remove(chat);
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public class AddMemberCommandHandler : IRequestHandler<AddMemberCommand, bool>
{
    private readonly AppDbContext _db;

    public AddMemberCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(AddMemberCommand request, CancellationToken cancellationToken)
    {
        var requester = await _db.ChatMembers
            .FirstOrDefaultAsync(cm => cm.ChatId == request.ChatId && cm.UserId == request.RequesterId && cm.LeftAt == null, cancellationToken);

        if (requester == null || requester.Role == MemberRole.Member)
            throw new UnauthorizedAccessException("Only admins can add members.");

        var existing = await _db.ChatMembers
            .FirstOrDefaultAsync(cm => cm.ChatId == request.ChatId && cm.UserId == request.UserId, cancellationToken);

        if (existing != null)
        {
            if (existing.LeftAt.HasValue)
            {
                existing.LeftAt = null;
                existing.JoinedAt = DateTime.UtcNow;
                existing.Role = Enum.Parse<MemberRole>(request.Role, true);
            }
            else throw new InvalidOperationException("User is already a member.");
        }
        else
        {
            _db.ChatMembers.Add(new ChatMember
            {
                ChatId = request.ChatId,
                UserId = request.UserId,
                Role = Enum.Parse<MemberRole>(request.Role, true),
                JoinedAt = DateTime.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public class RemoveMemberCommandHandler : IRequestHandler<RemoveMemberCommand, bool>
{
    private readonly AppDbContext _db;

    public RemoveMemberCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(RemoveMemberCommand request, CancellationToken cancellationToken)
    {
        var requester = await _db.ChatMembers
            .FirstOrDefaultAsync(cm => cm.ChatId == request.ChatId && cm.UserId == request.RequesterId && cm.LeftAt == null, cancellationToken);

        // Allow self-removal or admin removal
        if (request.RequesterId != request.UserId &&
            (requester == null || requester.Role == MemberRole.Member))
            throw new UnauthorizedAccessException("Only admins can remove members.");

        var member = await _db.ChatMembers
            .FirstOrDefaultAsync(cm => cm.ChatId == request.ChatId && cm.UserId == request.UserId && cm.LeftAt == null, cancellationToken)
            ?? throw new KeyNotFoundException("Member not found.");

        member.LeftAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(cancellationToken);
        return true;
    }
}

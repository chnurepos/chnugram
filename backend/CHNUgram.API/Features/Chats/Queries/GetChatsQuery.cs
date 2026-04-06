using CHNUgram.API.Common;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Chats.Queries;

public record GetUserChatsQuery(string UserId) : IRequest<List<ChatDto>>;
public record GetChatQuery(string ChatId, string UserId) : IRequest<ChatDto>;

public class GetUserChatsQueryHandler : IRequestHandler<GetUserChatsQuery, List<ChatDto>>
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;

    public GetUserChatsQueryHandler(AppDbContext db, IRedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    public async Task<List<ChatDto>> Handle(GetUserChatsQuery request, CancellationToken cancellationToken)
    {
        // Load all chats the user is a member of, with members and last message
        var chats = await _db.Chats
            .Where(c => _db.ChatMembers.Any(cm =>
                cm.ChatId == c.Id &&
                cm.UserId == request.UserId &&
                cm.LeftAt == null))
            .Include(c => c.Members.Where(m => m.LeftAt == null))
                .ThenInclude(m => m.User)
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync(cancellationToken);

        var result = new List<ChatDto>();

        foreach (var chat in chats)
        {
            // Get last message separately to avoid EF ordering issues
            var lastMsg = await _db.Messages
                .Include(m => m.Sender)
                .Include(m => m.Attachments)
                .Include(m => m.Reactions).ThenInclude(r => r.User)
                .Include(m => m.Reads)
                .Where(m => m.ChatId == chat.Id)
                .OrderByDescending(m => m.SentAt)
                .FirstOrDefaultAsync(cancellationToken);

            // Count unread
            var unread = await _db.Messages
                .CountAsync(m =>
                    m.ChatId == chat.Id &&
                    !m.IsDeleted &&
                    m.SenderId != request.UserId &&
                    !_db.MessageReads.Any(mr => mr.MessageId == m.Id && mr.UserId == request.UserId),
                    cancellationToken);

            var memberDtos = new List<ChatMemberDto>();
            foreach (var member in chat.Members)
            {
                var isOnline = await _redis.IsUserOnlineAsync(member.UserId);
                memberDtos.Add(new ChatMemberDto(
                    member.UserId,
                    member.User!.Username,
                    member.User.DisplayName,
                    member.User.AvatarUrl,
                    member.Role.ToString().ToLower(),
                    isOnline,
                    member.JoinedAt));
            }

            MessageDto? lastMsgDto = null;
            if (lastMsg != null)
                lastMsgDto = BuildMessageDto(lastMsg);

            result.Add(new ChatDto(
                chat.Id,
                chat.Type.ToString().ToLower(),
                chat.Name,
                chat.Description,
                chat.AvatarUrl,
                chat.CreatedBy,
                chat.CreatedAt,
                memberDtos,
                lastMsgDto,
                unread));
        }

        return result;
    }

    private static MessageDto BuildMessageDto(Domain.Entities.Message msg) => new(
        msg.Id,
        msg.ChatId,
        msg.SenderId,
        msg.Sender?.Username ?? "",
        msg.Sender?.DisplayName ?? "",
        msg.Sender?.AvatarUrl,
        msg.ReplyToId,
        msg.ForwardedFrom,
        msg.Type.ToString().ToLower(),
        msg.IsDeleted ? null : msg.Content,
        msg.IsEdited,
        msg.EditedAt,
        msg.IsDeleted,
        msg.SentAt,
        msg.Attachments.Select(a => new AttachmentDto(a.Id, a.FileName, a.FilePath, a.FileSize, a.MimeType, a.Width, a.Height, a.DurationMs)).ToList(),
        msg.Reactions.Select(r => new ReactionDto(r.UserId, r.User?.Username ?? "", r.Emoji)).ToList(),
        msg.Reads.Select(r => r.UserId).ToList()
    );
}

public class GetChatQueryHandler : IRequestHandler<GetChatQuery, ChatDto>
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;

    public GetChatQueryHandler(AppDbContext db, IRedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    public async Task<ChatDto> Handle(GetChatQuery request, CancellationToken cancellationToken)
    {
        var isMember = await _db.ChatMembers.AnyAsync(
            cm => cm.ChatId == request.ChatId && cm.UserId == request.UserId && cm.LeftAt == null,
            cancellationToken);

        if (!isMember) throw new UnauthorizedAccessException("You are not a member of this chat.");

        var chat = await _db.Chats
            .Include(c => c.Members.Where(m => m.LeftAt == null))
                .ThenInclude(m => m.User)
            .FirstOrDefaultAsync(c => c.Id == request.ChatId, cancellationToken)
            ?? throw new KeyNotFoundException("Chat not found.");

        var memberDtos = new List<ChatMemberDto>();
        foreach (var member in chat.Members)
        {
            var isOnline = await _redis.IsUserOnlineAsync(member.UserId);
            memberDtos.Add(new ChatMemberDto(
                member.UserId,
                member.User!.Username,
                member.User.DisplayName,
                member.User.AvatarUrl,
                member.Role.ToString().ToLower(),
                isOnline,
                member.JoinedAt));
        }

        return new ChatDto(
            chat.Id,
            chat.Type.ToString().ToLower(),
            chat.Name,
            chat.Description,
            chat.AvatarUrl,
            chat.CreatedBy,
            chat.CreatedAt,
            memberDtos,
            null,
            0);
    }
}

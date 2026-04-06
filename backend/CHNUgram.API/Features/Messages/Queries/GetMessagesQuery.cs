using CHNUgram.API.Common;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Messages.Queries;

public record GetMessagesQuery(string ChatId, string UserId, int Page = 1, int PageSize = 50) : IRequest<PagedResult<MessageDto>>;

public class GetMessagesQueryHandler : IRequestHandler<GetMessagesQuery, PagedResult<MessageDto>>
{
    private readonly AppDbContext _db;

    public GetMessagesQueryHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<PagedResult<MessageDto>> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
    {
        var isMember = await _db.ChatMembers.AnyAsync(
            cm => cm.ChatId == request.ChatId && cm.UserId == request.UserId && cm.LeftAt == null,
            cancellationToken);

        if (!isMember) throw new UnauthorizedAccessException("You are not a member of this chat.");

        var total = await _db.Messages
            .CountAsync(m => m.ChatId == request.ChatId, cancellationToken);

        var messages = await _db.Messages
            .Where(m => m.ChatId == request.ChatId)
            .Include(m => m.Sender)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.Reads)
            .OrderByDescending(m => m.SentAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = messages
            .OrderBy(m => m.SentAt)
            .Select(m => new MessageDto(
                m.Id,
                m.ChatId,
                m.SenderId,
                m.Sender?.Username ?? "",
                m.Sender?.DisplayName ?? "",
                m.Sender?.AvatarUrl,
                m.ReplyToId,
                m.ForwardedFrom,
                m.Type.ToString().ToLower(),
                m.IsDeleted ? null : m.Content,
                m.IsEdited,
                m.EditedAt,
                m.IsDeleted,
                m.SentAt,
                m.Attachments.Select(a => new AttachmentDto(
                    a.Id, a.FileName, a.FilePath, a.FileSize, a.MimeType, a.Width, a.Height, a.DurationMs
                )).ToList(),
                m.Reactions.Select(r => new ReactionDto(r.UserId, r.User?.Username ?? "", r.Emoji)).ToList(),
                m.Reads.Select(r => r.UserId).ToList()
            ))
            .ToList();

        return new PagedResult<MessageDto>
        {
            Items = dtos,
            Total = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}

using CHNUgram.API.Common;
using CHNUgram.API.Domain.Entities;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Messages.Commands;

public record SendMessageCommand(
    string ChatId,
    string SenderId,
    string? Content,
    string Type,
    string? ReplyToId,
    List<IFormFile>? Files = null
) : IRequest<MessageDto>;

public record EditMessageCommand(string MessageId, string UserId, string Content) : IRequest<MessageDto>;
public record DeleteMessageCommand(string MessageId, string UserId) : IRequest<string>;
public record MarkMessageReadCommand(string MessageId, string UserId) : IRequest<bool>;
public record AddReactionCommand(string MessageId, string UserId, string Emoji) : IRequest<string>; // returns "added" | "removed"
public record RemoveReactionCommand(string MessageId, string UserId, string Emoji) : IRequest<bool>;

public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, MessageDto>
{
    private readonly AppDbContext _db;
    private readonly IFileStorageService _storage;

    public SendMessageCommandHandler(AppDbContext db, IFileStorageService storage)
    {
        _db = db;
        _storage = storage;
    }

    public async Task<MessageDto> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var isMember = await _db.ChatMembers.AnyAsync(
            cm => cm.ChatId == request.ChatId && cm.UserId == request.SenderId && cm.LeftAt == null,
            cancellationToken);

        if (!isMember) throw new UnauthorizedAccessException("You are not a member of this chat.");

        var msgType = Enum.Parse<MessageType>(request.Type, true);

        var message = new Message
        {
            ChatId = request.ChatId,
            SenderId = request.SenderId,
            ReplyToId = request.ReplyToId,
            Type = msgType,
            Content = request.Content,
            SentAt = DateTime.UtcNow
        };
        _db.Messages.Add(message);

        if (request.Files != null && request.Files.Count > 0)
        {
            foreach (var file in request.Files)
            {
                var (filePath, _) = await _storage.SaveFileAsync(file, "messages");
                _db.Attachments.Add(new Attachment
                {
                    MessageId = message.Id,
                    FileName = file.FileName,
                    FilePath = filePath,
                    FileSize = file.Length,
                    MimeType = file.ContentType
                });

                if (file.ContentType.StartsWith("image/"))
                    message.Type = MessageType.Image;
                else if (file.ContentType.StartsWith("audio/"))
                    message.Type = MessageType.Voice;
                else
                    message.Type = MessageType.File;
            }
        }

        // Update chat timestamp
        await _db.Chats
            .Where(c => c.Id == request.ChatId)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.UpdatedAt, DateTime.UtcNow), cancellationToken);

        await _db.SaveChangesAsync(cancellationToken);

        // Reload with relations
        var saved = await _db.Messages
            .Include(m => m.Sender)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.Reads)
            .FirstAsync(m => m.Id == message.Id, cancellationToken);

        return BuildDto(saved);
    }

    private static MessageDto BuildDto(Message m) => new(
        m.Id, m.ChatId, m.SenderId,
        m.Sender?.Username ?? "", m.Sender?.DisplayName ?? "", m.Sender?.AvatarUrl,
        m.ReplyToId, m.ForwardedFrom,
        m.Type.ToString().ToLower(),
        m.IsDeleted ? null : m.Content,
        m.IsEdited, m.EditedAt, m.IsDeleted, m.SentAt,
        m.Attachments.Select(a => new AttachmentDto(a.Id, a.FileName, a.FilePath, a.FileSize, a.MimeType, a.Width, a.Height, a.DurationMs)).ToList(),
        m.Reactions.Select(r => new ReactionDto(r.UserId, r.User?.Username ?? "", r.Emoji)).ToList(),
        m.Reads.Select(r => r.UserId).ToList()
    );
}

public class EditMessageCommandHandler : IRequestHandler<EditMessageCommand, MessageDto>
{
    private readonly AppDbContext _db;

    public EditMessageCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<MessageDto> Handle(EditMessageCommand request, CancellationToken cancellationToken)
    {
        var message = await _db.Messages
            .Include(m => m.Sender)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.Reads)
            .FirstOrDefaultAsync(m => m.Id == request.MessageId, cancellationToken)
            ?? throw new KeyNotFoundException("Message not found.");

        if (message.SenderId != request.UserId)
            throw new UnauthorizedAccessException("You can only edit your own messages.");

        if (message.IsDeleted)
            throw new InvalidOperationException("Cannot edit deleted messages.");

        message.Content = request.Content;
        message.IsEdited = true;
        message.EditedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);

        return new MessageDto(
            message.Id, message.ChatId, message.SenderId,
            message.Sender?.Username ?? "", message.Sender?.DisplayName ?? "", message.Sender?.AvatarUrl,
            message.ReplyToId, message.ForwardedFrom,
            message.Type.ToString().ToLower(),
            message.Content,
            message.IsEdited, message.EditedAt, message.IsDeleted, message.SentAt,
            message.Attachments.Select(a => new AttachmentDto(a.Id, a.FileName, a.FilePath, a.FileSize, a.MimeType, a.Width, a.Height, a.DurationMs)).ToList(),
            message.Reactions.Select(r => new ReactionDto(r.UserId, r.User?.Username ?? "", r.Emoji)).ToList(),
            message.Reads.Select(r => r.UserId).ToList()
        );
    }
}

public class DeleteMessageCommandHandler : IRequestHandler<DeleteMessageCommand, string>
{
    private readonly AppDbContext _db;

    public DeleteMessageCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<string> Handle(DeleteMessageCommand request, CancellationToken cancellationToken)
    {
        var message = await _db.Messages
            .FirstOrDefaultAsync(m => m.Id == request.MessageId, cancellationToken)
            ?? throw new KeyNotFoundException("Message not found.");

        if (message.SenderId != request.UserId)
        {
            var isAdmin = await _db.ChatMembers.AnyAsync(
                cm => cm.ChatId == message.ChatId && cm.UserId == request.UserId &&
                      cm.LeftAt == null && cm.Role != MemberRole.Member,
                cancellationToken);
            if (!isAdmin) throw new UnauthorizedAccessException("You cannot delete this message.");
        }

        message.IsDeleted = true;
        message.DeletedAt = DateTime.UtcNow;
        message.Content = null;

        await _db.SaveChangesAsync(cancellationToken);
        return message.ChatId;
    }
}

public class MarkMessageReadCommandHandler : IRequestHandler<MarkMessageReadCommand, bool>
{
    private readonly AppDbContext _db;

    public MarkMessageReadCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(MarkMessageReadCommand request, CancellationToken cancellationToken)
    {
        var exists = await _db.MessageReads.AnyAsync(
            mr => mr.MessageId == request.MessageId && mr.UserId == request.UserId,
            cancellationToken);

        if (!exists)
        {
            _db.MessageReads.Add(new MessageRead
            {
                MessageId = request.MessageId,
                UserId = request.UserId,
                ReadAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync(cancellationToken);
        }

        return true;
    }
}

public class AddReactionCommandHandler : IRequestHandler<AddReactionCommand, string>
{
    private readonly AppDbContext _db;

    public AddReactionCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<string> Handle(AddReactionCommand request, CancellationToken cancellationToken)
    {
        // Remove any existing reaction from this user on this message (1 reaction per user)
        var existing = await _db.MessageReactions
            .Where(mr => mr.MessageId == request.MessageId && mr.UserId == request.UserId)
            .ToListAsync(cancellationToken);

        if (existing.Any())
        {
            var previousEmoji = existing.First().Emoji;
            _db.MessageReactions.RemoveRange(existing);

            // If already reacted with the same emoji — toggle off (remove only)
            if (previousEmoji == request.Emoji)
            {
                await _db.SaveChangesAsync(cancellationToken);
                return $"removed:{previousEmoji}";
            }
        }

        _db.MessageReactions.Add(new MessageReaction
        {
            MessageId = request.MessageId,
            UserId = request.UserId,
            Emoji = request.Emoji,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(cancellationToken);

        return "added";
    }
}

public class RemoveReactionCommandHandler : IRequestHandler<RemoveReactionCommand, bool>
{
    private readonly AppDbContext _db;

    public RemoveReactionCommandHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(RemoveReactionCommand request, CancellationToken cancellationToken)
    {
        var reaction = await _db.MessageReactions.FirstOrDefaultAsync(
            mr => mr.MessageId == request.MessageId && mr.UserId == request.UserId && mr.Emoji == request.Emoji,
            cancellationToken);

        if (reaction != null)
        {
            _db.MessageReactions.Remove(reaction);
            await _db.SaveChangesAsync(cancellationToken);
        }

        return true;
    }
}

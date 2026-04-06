namespace CHNUgram.API.Common;

// Auth DTOs
public record RegisterRequest(string Email, string Username, string DisplayName, string Password);
public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);
public record LogoutRequest(string RefreshToken);

public record AuthResponse(
    string AccessToken,
    string RefreshToken,
    UserDto User
);

// User DTOs
public record UserDto(
    string Id,
    string Email,
    string Username,
    string DisplayName,
    string? AvatarUrl,
    string? Bio,
    bool IsVerified,
    DateTime? LastSeenAt,
    bool IsOnline,
    DateTime CreatedAt
);

public record UpdateProfileRequest(string? DisplayName, string? Bio, string? Username);

// Chat DTOs
public record ChatDto(
    string Id,
    string Type,
    string? Name,
    string? Description,
    string? AvatarUrl,
    string CreatedBy,
    DateTime CreatedAt,
    List<ChatMemberDto> Members,
    MessageDto? LastMessage,
    int UnreadCount
);

public record ChatMemberDto(
    string UserId,
    string Username,
    string DisplayName,
    string? AvatarUrl,
    string Role,
    bool IsOnline,
    DateTime JoinedAt,
    DateTime? LastSeenAt = null
);

public record CreateChatRequest(string Type, string? Name, string? Description, List<string> MemberIds);
public record UpdateChatRequest(string? Name, string? Description);
public record AddMemberRequest(string UserId, string Role = "member");

// Message DTOs
public record MessageDto(
    string Id,
    string ChatId,
    string SenderId,
    string SenderUsername,
    string SenderDisplayName,
    string? SenderAvatarUrl,
    string? ReplyToId,
    string? ForwardedFrom,
    string Type,
    string? Content,
    bool IsEdited,
    DateTime? EditedAt,
    bool IsDeleted,
    DateTime SentAt,
    List<AttachmentDto> Attachments,
    List<ReactionDto> Reactions,
    List<string> ReadBy
);

public record SendMessageRequest(
    string? Content,
    string Type = "text",
    string? ReplyToId = null
);

public record EditMessageRequest(string Content);

public record AttachmentDto(
    string Id,
    string FileName,
    string FilePath,
    long FileSize,
    string MimeType,
    int? Width,
    int? Height,
    int? DurationMs
);

public record ReactionDto(
    string UserId,
    string Username,
    string Emoji
);

public record AddReactionRequest(string Emoji);

// SignalR event payloads
public record TypingEventDto(string ChatId, string UserId, string Username, bool IsTyping);
public record OnlineStatusDto(string UserId, bool IsOnline, DateTime? LastSeenAt);

namespace CHNUgram.API.Domain.Entities;

public enum MemberRole { Owner, Admin, Member }

public class ChatMember
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ChatId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public MemberRole Role { get; set; } = MemberRole.Member;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LeftAt { get; set; }
    public DateTime? MutedUntil { get; set; }

    // Navigation
    public Chat? Chat { get; set; }
    public User? User { get; set; }
}

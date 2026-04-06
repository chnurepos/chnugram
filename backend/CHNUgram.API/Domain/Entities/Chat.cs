namespace CHNUgram.API.Domain.Entities;

public enum ChatType { Private, Group }

public class Chat
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public ChatType Type { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? AvatarUrl { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User? Creator { get; set; }
    public ICollection<ChatMember> Members { get; set; } = new List<ChatMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}

namespace CHNUgram.API.Domain.Entities;

public class MessageRead
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string MessageId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public DateTime ReadAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Message? Message { get; set; }
    public User? User { get; set; }
}

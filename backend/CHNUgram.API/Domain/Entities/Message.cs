namespace CHNUgram.API.Domain.Entities;

public enum MessageType { Text, Image, File, Voice, System }

public class Message
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ChatId { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public string? ReplyToId { get; set; }
    public string? ForwardedFrom { get; set; }
    public MessageType Type { get; set; } = MessageType.Text;
    public string? Content { get; set; }
    public bool IsEdited { get; set; } = false;
    public DateTime? EditedAt { get; set; }
    public bool IsDeleted { get; set; } = false;
    public DateTime? DeletedAt { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Chat? Chat { get; set; }
    public User? Sender { get; set; }
    public Message? ReplyTo { get; set; }
    public ICollection<Message> Replies { get; set; } = new List<Message>();
    public ICollection<Attachment> Attachments { get; set; } = new List<Attachment>();
    public ICollection<MessageRead> Reads { get; set; } = new List<MessageRead>();
    public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
}

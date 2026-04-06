namespace CHNUgram.API.Domain.Entities;

public class Attachment
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string MessageId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string MimeType { get; set; } = string.Empty;
    public int? Width { get; set; }
    public int? Height { get; set; }
    public int? DurationMs { get; set; }

    // Navigation
    public Message? Message { get; set; }
}

using CHNUgram.API.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Chat> Chats => Set<Chat>();
    public DbSet<ChatMember> ChatMembers => Set<ChatMember>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<MessageRead> MessageReads => Set<MessageRead>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<EmailVerification> EmailVerifications => Set<EmailVerification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.ToTable("users");
            e.HasKey(u => u.Id);
            e.Property(u => u.Id).HasColumnName("id").HasColumnType("varchar(36)");
            e.Property(u => u.Email).HasColumnName("email").HasColumnType("varchar(100)").IsRequired();
            e.Property(u => u.Username).HasColumnName("username").HasColumnType("varchar(50)").IsRequired();
            e.Property(u => u.DisplayName).HasColumnName("display_name").HasColumnType("varchar(100)").IsRequired();
            e.Property(u => u.AvatarUrl).HasColumnName("avatar_url").HasColumnType("varchar(500)");
            e.Property(u => u.Bio).HasColumnName("bio").HasColumnType("varchar(300)");
            e.Property(u => u.PasswordHash).HasColumnName("password_hash").HasColumnType("varchar(256)").IsRequired();
            e.Property(u => u.IsVerified).HasColumnName("is_verified").HasDefaultValue(false);
            e.Property(u => u.LastSeenAt).HasColumnName("last_seen_at");
            e.Property(u => u.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(u => u.UpdatedAt).HasColumnName("updated_at").IsRequired();
            e.HasIndex(u => u.Email).IsUnique();
            e.HasIndex(u => u.Username).IsUnique();
        });

        // Chat
        modelBuilder.Entity<Chat>(e =>
        {
            e.ToTable("chats");
            e.HasKey(c => c.Id);
            e.Property(c => c.Id).HasColumnName("id").HasColumnType("varchar(36)");
            e.Property(c => c.Type).HasColumnName("type")
                .HasConversion(v => v.ToString().ToLower(), v => Enum.Parse<ChatType>(v, true));
            e.Property(c => c.Name).HasColumnName("name").HasColumnType("varchar(100)");
            e.Property(c => c.Description).HasColumnName("description").HasColumnType("varchar(500)");
            e.Property(c => c.AvatarUrl).HasColumnName("avatar_url").HasColumnType("varchar(500)");
            e.Property(c => c.CreatedBy).HasColumnName("created_by").HasColumnType("varchar(36)").IsRequired();
            e.Property(c => c.CreatedAt).HasColumnName("created_at").IsRequired();
            e.Property(c => c.UpdatedAt).HasColumnName("updated_at").IsRequired();
            e.HasOne(c => c.Creator).WithMany().HasForeignKey(c => c.CreatedBy).OnDelete(DeleteBehavior.Restrict);
        });

        // ChatMember
        modelBuilder.Entity<ChatMember>(e =>
        {
            e.ToTable("chat_members");
            e.HasKey(cm => cm.Id);
            e.Property(cm => cm.Id).HasColumnName("id").HasColumnType("varchar(36)");
            e.Property(cm => cm.ChatId).HasColumnName("chat_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(cm => cm.UserId).HasColumnName("user_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(cm => cm.Role).HasColumnName("role")
                .HasConversion(v => v.ToString().ToLower(), v => Enum.Parse<MemberRole>(v, true))
                .HasDefaultValue(MemberRole.Member);
            e.Property(cm => cm.JoinedAt).HasColumnName("joined_at").IsRequired();
            e.Property(cm => cm.LeftAt).HasColumnName("left_at");
            e.Property(cm => cm.MutedUntil).HasColumnName("muted_until");
            e.HasOne(cm => cm.Chat).WithMany(c => c.Members).HasForeignKey(cm => cm.ChatId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(cm => cm.User).WithMany(u => u.ChatMemberships).HasForeignKey(cm => cm.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        // Message
        modelBuilder.Entity<Message>(e =>
        {
            e.ToTable("messages");
            e.HasKey(m => m.Id);
            e.Property(m => m.Id).HasColumnName("id").HasColumnType("varchar(36)");
            e.Property(m => m.ChatId).HasColumnName("chat_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(m => m.SenderId).HasColumnName("sender_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(m => m.ReplyToId).HasColumnName("reply_to_id").HasColumnType("varchar(36)");
            e.Property(m => m.ForwardedFrom).HasColumnName("forwarded_from").HasColumnType("varchar(36)");
            e.Property(m => m.Type).HasColumnName("type")
                .HasConversion(v => v.ToString().ToLower(), v => Enum.Parse<MessageType>(v, true))
                .HasDefaultValue(MessageType.Text);
            e.Property(m => m.Content).HasColumnName("content").HasColumnType("TEXT");
            e.Property(m => m.IsEdited).HasColumnName("is_edited").HasDefaultValue(false);
            e.Property(m => m.EditedAt).HasColumnName("edited_at");
            e.Property(m => m.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);
            e.Property(m => m.DeletedAt).HasColumnName("deleted_at");
            e.Property(m => m.SentAt).HasColumnName("sent_at");
            e.HasOne(m => m.Chat).WithMany(c => c.Messages).HasForeignKey(m => m.ChatId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(m => m.Sender).WithMany(u => u.Messages).HasForeignKey(m => m.SenderId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(m => m.ReplyTo).WithMany(m => m.Replies).HasForeignKey(m => m.ReplyToId).OnDelete(DeleteBehavior.SetNull);
        });

        // Attachment
        modelBuilder.Entity<Attachment>(e =>
        {
            e.ToTable("attachments");
            e.HasKey(a => a.Id);
            e.Property(a => a.Id).HasColumnName("id").HasColumnType("varchar(36)");
            e.Property(a => a.MessageId).HasColumnName("message_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(a => a.FileName).HasColumnName("file_name").HasColumnType("varchar(255)").IsRequired();
            e.Property(a => a.FilePath).HasColumnName("file_path").HasColumnType("varchar(500)").IsRequired();
            e.Property(a => a.FileSize).HasColumnName("file_size").IsRequired();
            e.Property(a => a.MimeType).HasColumnName("mime_type").HasColumnType("varchar(100)").IsRequired();
            e.Property(a => a.Width).HasColumnName("width");
            e.Property(a => a.Height).HasColumnName("height");
            e.Property(a => a.DurationMs).HasColumnName("duration_ms");
            e.HasOne(a => a.Message).WithMany(m => m.Attachments).HasForeignKey(a => a.MessageId).OnDelete(DeleteBehavior.Cascade);
        });

        // MessageRead
        modelBuilder.Entity<MessageRead>(e =>
        {
            e.ToTable("message_reads");
            e.HasKey(mr => mr.Id);
            e.Property(mr => mr.Id).HasColumnName("id").HasColumnType("varchar(36)");
            e.Property(mr => mr.MessageId).HasColumnName("message_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(mr => mr.UserId).HasColumnName("user_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(mr => mr.ReadAt).HasColumnName("read_at");
            e.HasOne(mr => mr.Message).WithMany(m => m.Reads).HasForeignKey(mr => mr.MessageId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(mr => mr.User).WithMany(u => u.MessageReads).HasForeignKey(mr => mr.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(mr => new { mr.MessageId, mr.UserId }).IsUnique();
        });

        // MessageReaction
        modelBuilder.Entity<MessageReaction>(e =>
        {
            e.ToTable("message_reactions");
            e.HasKey(mr => mr.Id);
            e.Property(mr => mr.Id).HasColumnName("id").HasColumnType("varchar(36)");
            e.Property(mr => mr.MessageId).HasColumnName("message_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(mr => mr.UserId).HasColumnName("user_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(mr => mr.Emoji).HasColumnName("emoji").HasColumnType("varchar(10)").IsRequired();
            e.Property(mr => mr.CreatedAt).HasColumnName("created_at");
            e.HasOne(mr => mr.Message).WithMany(m => m.Reactions).HasForeignKey(mr => mr.MessageId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(mr => mr.User).WithMany(u => u.MessageReactions).HasForeignKey(mr => mr.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(mr => new { mr.MessageId, mr.UserId, mr.Emoji }).IsUnique();
        });

        // RefreshToken
        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasKey(rt => rt.Id);
            e.Property(rt => rt.Id).HasColumnName("id").HasColumnType("varchar(36)");
            e.Property(rt => rt.UserId).HasColumnName("user_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(rt => rt.Token).HasColumnName("token").HasColumnType("varchar(512)").IsRequired();
            e.Property(rt => rt.ExpiresAt).HasColumnName("expires_at").IsRequired();
            e.Property(rt => rt.RevokedAt).HasColumnName("revoked_at");
            e.HasOne(rt => rt.User).WithMany(u => u.RefreshTokens).HasForeignKey(rt => rt.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(rt => rt.Token).IsUnique();
        });

        // EmailVerification
        modelBuilder.Entity<EmailVerification>(e =>
        {
            e.ToTable("email_verifications");
            e.HasKey(ev => ev.Id);
            e.Property(ev => ev.Id).HasColumnName("id").HasColumnType("varchar(36)");
            e.Property(ev => ev.UserId).HasColumnName("user_id").HasColumnType("varchar(36)").IsRequired();
            e.Property(ev => ev.Token).HasColumnName("token").HasColumnType("varchar(256)").IsRequired();
            e.Property(ev => ev.ExpiresAt).HasColumnName("expires_at").IsRequired();
            e.Property(ev => ev.UsedAt).HasColumnName("used_at");
            e.HasOne(ev => ev.User).WithMany(u => u.EmailVerifications).HasForeignKey(ev => ev.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(ev => ev.Token).IsUnique();
        });
    }
}

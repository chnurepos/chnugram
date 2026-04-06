using System.Security.Claims;
using CHNUgram.API.Common;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(AppDbContext db, IRedisService redis, ILogger<ChatHub> logger)
    {
        _db = db;
        _redis = redis;
        _logger = logger;
    }

    private string UserId => Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new HubException("Unauthorized");

    public override async Task OnConnectedAsync()
    {
        try
        {
            var userId = UserId;
            await _redis.SetUserOnlineAsync(userId);

            // Join all user's chat groups
            var chatIds = await _db.ChatMembers
                .Where(cm => cm.UserId == userId && cm.LeftAt == null)
                .Select(cm => cm.ChatId)
                .ToListAsync();

            foreach (var chatId in chatIds)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"chat:{chatId}");
            }

            // Notify contacts that user is online
            await Clients.Others.SendAsync("UserOnline", new OnlineStatusDto(userId, true, null));

            _logger.LogInformation("User {UserId} connected via SignalR", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in OnConnectedAsync");
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try
        {
            var userId = UserId;
            await _redis.SetUserOfflineAsync(userId);

            var lastSeen = DateTime.UtcNow;
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (user != null)
            {
                user.LastSeenAt = lastSeen;
                user.UpdatedAt = lastSeen;
                await _db.SaveChangesAsync();
            }

            await Clients.Others.SendAsync("UserOffline", new OnlineStatusDto(userId, false, lastSeen));

            _logger.LogInformation("User {UserId} disconnected from SignalR", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in OnDisconnectedAsync");
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task JoinChat(string chatId)
    {
        var userId = UserId;
        var isMember = await _db.ChatMembers.AnyAsync(
            cm => cm.ChatId == chatId && cm.UserId == userId && cm.LeftAt == null);

        if (!isMember) throw new HubException("You are not a member of this chat.");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"chat:{chatId}");
        _logger.LogDebug("User {UserId} joined chat group {ChatId}", userId, chatId);
    }

    public async Task LeaveChat(string chatId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat:{chatId}");
    }

    public async Task Typing(string chatId)
    {
        var userId = UserId;
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return;

        await Clients.OthersInGroup($"chat:{chatId}")
            .SendAsync("UserTyping", new TypingEventDto(chatId, userId, user.Username, true));
    }

    public async Task StopTyping(string chatId)
    {
        var userId = UserId;
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return;

        await Clients.OthersInGroup($"chat:{chatId}")
            .SendAsync("UserTyping", new TypingEventDto(chatId, userId, user.Username, false));
    }
}

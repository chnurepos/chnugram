using System.Collections.Concurrent;

namespace CHNUgram.API.Infrastructure.Services;

public interface IRedisService
{
    Task SetUserOnlineAsync(string userId);
    Task SetUserOfflineAsync(string userId);
    Task<bool> IsUserOnlineAsync(string userId);
    Task<IEnumerable<string>> GetOnlineUsersAsync(IEnumerable<string> userIds);
    Task SetAsync(string key, string value, TimeSpan? expiry = null);
    Task<string?> GetAsync(string key);
    Task DeleteAsync(string key);
}

/// <summary>
/// In-memory implementation of IRedisService (no Redis required).
/// Online status is tracked using a ConcurrentDictionary with expiry timestamps.
/// </summary>
public class InMemoryOnlineService : IRedisService
{
    private readonly ConcurrentDictionary<string, DateTime> _onlineUsers = new();
    private readonly ConcurrentDictionary<string, (string Value, DateTime? Expiry)> _store = new();

    public Task SetUserOnlineAsync(string userId)
    {
        _onlineUsers[userId] = DateTime.UtcNow.AddMinutes(10);
        return Task.CompletedTask;
    }

    public Task SetUserOfflineAsync(string userId)
    {
        _onlineUsers.TryRemove(userId, out _);
        return Task.CompletedTask;
    }

    public Task<bool> IsUserOnlineAsync(string userId)
    {
        if (_onlineUsers.TryGetValue(userId, out var expiry))
        {
            if (expiry > DateTime.UtcNow)
                return Task.FromResult(true);
            _onlineUsers.TryRemove(userId, out _);
        }
        return Task.FromResult(false);
    }

    public async Task<IEnumerable<string>> GetOnlineUsersAsync(IEnumerable<string> userIds)
    {
        var online = new List<string>();
        foreach (var userId in userIds)
            if (await IsUserOnlineAsync(userId))
                online.Add(userId);
        return online;
    }

    public Task SetAsync(string key, string value, TimeSpan? expiry = null)
    {
        var expiryTime = expiry.HasValue ? DateTime.UtcNow.Add(expiry.Value) : (DateTime?)null;
        _store[key] = (value, expiryTime);
        return Task.CompletedTask;
    }

    public Task<string?> GetAsync(string key)
    {
        if (_store.TryGetValue(key, out var entry))
        {
            if (entry.Expiry == null || entry.Expiry > DateTime.UtcNow)
                return Task.FromResult<string?>(entry.Value);
            _store.TryRemove(key, out _);
        }
        return Task.FromResult<string?>(null);
    }

    public Task DeleteAsync(string key)
    {
        _store.TryRemove(key, out _);
        return Task.CompletedTask;
    }
}

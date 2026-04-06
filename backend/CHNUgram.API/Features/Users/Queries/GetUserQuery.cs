using CHNUgram.API.Common;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Features.Users.Queries;

public record GetUserQuery(string UserId) : IRequest<UserDto>;
public record GetCurrentUserQuery(string UserId) : IRequest<UserDto>;
public record SearchUsersQuery(string Query, int Page = 1, int PageSize = 20) : IRequest<PagedResult<UserDto>>;

public class GetUserQueryHandler : IRequestHandler<GetUserQuery, UserDto>
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;

    public GetUserQueryHandler(AppDbContext db, IRedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    public async Task<UserDto> Handle(GetUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var isOnline = await _redis.IsUserOnlineAsync(user.Id);
        return user.ToDto(isOnline);
    }
}

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, UserDto>
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;

    public GetCurrentUserQueryHandler(AppDbContext db, IRedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    public async Task<UserDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken)
            ?? throw new KeyNotFoundException("User not found.");

        var isOnline = await _redis.IsUserOnlineAsync(user.Id);
        return user.ToDto(isOnline);
    }
}

public class SearchUsersQueryHandler : IRequestHandler<SearchUsersQuery, PagedResult<UserDto>>
{
    private readonly AppDbContext _db;
    private readonly IRedisService _redis;

    public SearchUsersQueryHandler(AppDbContext db, IRedisService redis)
    {
        _db = db;
        _redis = redis;
    }

    public async Task<PagedResult<UserDto>> Handle(SearchUsersQuery request, CancellationToken cancellationToken)
    {
        var query = _db.Users.AsQueryable();
        var searchTerm = request.Query.ToLower().TrimStart('@');

        query = query.Where(u =>
            u.Username.Contains(searchTerm) ||
            u.DisplayName.Contains(searchTerm) ||
            u.Email.Contains(searchTerm));

        var total = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderBy(u => u.Username)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            var isOnline = await _redis.IsUserOnlineAsync(user.Id);
            dtos.Add(user.ToDto(isOnline));
        }

        return new PagedResult<UserDto>
        {
            Items = dtos,
            Total = total,
            Page = request.Page,
            PageSize = request.PageSize
        };
    }
}

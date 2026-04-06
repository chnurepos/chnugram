using CHNUgram.API.Domain.Entities;

namespace CHNUgram.API.Common;

public static class MappingExtensions
{
    public static UserDto ToDto(this User user, bool isOnline) =>
        new(
            user.Id,
            user.Email,
            user.Username,
            user.DisplayName,
            user.AvatarUrl,
            user.Bio,
            user.IsVerified,
            user.LastSeenAt,
            isOnline,
            user.CreatedAt
        );
}

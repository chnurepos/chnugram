using System.Security.Claims;
using CHNUgram.API.Common;
using CHNUgram.API.Features.Users.Commands;
using CHNUgram.API.Features.Users.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CHNUgram.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public UsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var result = await _mediator.Send(new GetCurrentUserQuery(UserId));
        return Ok(ApiResponse<UserDto>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(string id)
    {
        try
        {
            var result = await _mediator.Send(new GetUserQuery(id));
            return Ok(ApiResponse<UserDto>.Ok(result));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<UserDto>.Fail(ex.Message));
        }
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        try
        {
            var result = await _mediator.Send(new UpdateProfileCommand(UserId, request.DisplayName, request.Bio, request.Username));
            return Ok(ApiResponse<UserDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<UserDto>.Fail(ex.Message));
        }
    }

    [HttpPut("me/avatar")]
    public async Task<IActionResult> UpdateAvatar([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<UserDto>.Fail("No file provided."));

        var result = await _mediator.Send(new UpdateAvatarCommand(UserId, file));
        return Ok(ApiResponse<UserDto>.Ok(result));
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(ApiResponse<PagedResult<UserDto>>.Fail("Query is required."));

        var result = await _mediator.Send(new SearchUsersQuery(q, page, pageSize));
        return Ok(ApiResponse<PagedResult<UserDto>>.Ok(result));
    }
}

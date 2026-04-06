using System.Security.Claims;
using CHNUgram.API.Common;
using CHNUgram.API.Features.Chats.Commands;
using CHNUgram.API.Features.Chats.Queries;
using CHNUgram.API.Hubs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CHNUgram.API.Controllers;

[ApiController]
[Route("api/chats")]
[Authorize]
public class ChatsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatsController(IMediator mediator, IHubContext<ChatHub> hubContext)
    {
        _mediator = mediator;
        _hubContext = hubContext;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet]
    public async Task<IActionResult> GetChats()
    {
        var result = await _mediator.Send(new GetUserChatsQuery(UserId));
        return Ok(ApiResponse<List<ChatDto>>.Ok(result));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetChat(string id)
    {
        try
        {
            var result = await _mediator.Send(new GetChatQuery(id, UserId));
            return Ok(ApiResponse<ChatDto>.Ok(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<ChatDto>.Fail(ex.Message));
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateChat([FromBody] CreateChatRequest request)
    {
        try
        {
            var result = await _mediator.Send(new CreateChatCommand(
                UserId, request.Type, request.Name, request.Description, request.MemberIds));

            // Notify members about new chat
            foreach (var memberId in request.MemberIds)
            {
                await _hubContext.Clients.User(memberId).SendAsync("NewChat", result);
            }

            return CreatedAtAction(nameof(GetChat), new { id = result.Id }, ApiResponse<ChatDto>.Ok(result));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<ChatDto>.Fail(ex.Message));
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateChat(string id, [FromBody] UpdateChatRequest request)
    {
        try
        {
            var result = await _mediator.Send(new UpdateChatCommand(id, UserId, request.Name, request.Description));
            await _hubContext.Clients.Group($"chat:{id}").SendAsync("ChatUpdated", result);
            return Ok(ApiResponse<ChatDto>.Ok(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpPut("{id}/avatar")]
    public async Task<IActionResult> UpdateChatAvatar(string id, IFormFile file)
    {
        try
        {
            var url = await _mediator.Send(new UpdateChatAvatarCommand(id, UserId, file));
            await _hubContext.Clients.Group($"chat:{id}").SendAsync("ChatAvatarUpdated", new { chatId = id, avatarUrl = url });
            return Ok(ApiResponse<string>.Ok(url));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteChat(string id)
    {
        try
        {
            await _mediator.Send(new DeleteChatCommand(id, UserId));
            await _hubContext.Clients.Group($"chat:{id}").SendAsync("ChatDeleted", id);
            return Ok(ApiResponse<bool>.Ok(true));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddMember(string id, [FromBody] AddMemberRequest request)
    {
        try
        {
            await _mediator.Send(new AddMemberCommand(id, UserId, request.UserId, request.Role));
            await _hubContext.Clients.Group($"chat:{id}").SendAsync("MemberAdded", new { chatId = id, userId = request.UserId });
            return Ok(ApiResponse<bool>.Ok(true));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.Fail(ex.Message));
        }
    }

    [HttpDelete("{id}/members/{userId}")]
    public async Task<IActionResult> RemoveMember(string id, string userId)
    {
        try
        {
            await _mediator.Send(new RemoveMemberCommand(id, UserId, userId));
            await _hubContext.Clients.Group($"chat:{id}").SendAsync("MemberRemoved", new { chatId = id, userId });
            return Ok(ApiResponse<bool>.Ok(true));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message));
        }
    }
}

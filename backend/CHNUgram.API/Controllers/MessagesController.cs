using System.Security.Claims;
using CHNUgram.API.Common;
using CHNUgram.API.Features.Messages.Commands;
using CHNUgram.API.Features.Messages.Queries;
using CHNUgram.API.Hubs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace CHNUgram.API.Controllers;

[ApiController]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IHubContext<ChatHub> _hubContext;

    public MessagesController(IMediator mediator, IHubContext<ChatHub> hubContext)
    {
        _mediator = mediator;
        _hubContext = hubContext;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpGet("api/chats/{chatId}/messages")]
    public async Task<IActionResult> GetMessages(string chatId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        try
        {
            var result = await _mediator.Send(new GetMessagesQuery(chatId, UserId, page, pageSize));
            return Ok(ApiResponse<PagedResult<MessageDto>>.Ok(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpPost("api/chats/{chatId}/messages")]
    public async Task<IActionResult> SendMessage(string chatId, [FromForm] SendMessageRequest request, [FromForm] List<IFormFile>? files)
    {
        try
        {
            var result = await _mediator.Send(new SendMessageCommand(
                chatId, UserId, request.Content, request.Type, request.ReplyToId, files));

            // Broadcast to all chat members via SignalR
            await _hubContext.Clients.Group($"chat:{chatId}").SendAsync("NewMessage", result);

            return Ok(ApiResponse<MessageDto>.Ok(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message));
        }
    }

    [HttpPut("api/messages/{id}")]
    public async Task<IActionResult> EditMessage(string id, [FromBody] EditMessageRequest request)
    {
        try
        {
            var result = await _mediator.Send(new EditMessageCommand(id, UserId, request.Content));
            await _hubContext.Clients.Group($"chat:{result.ChatId}").SendAsync("MessageEdited", result);
            return Ok(ApiResponse<MessageDto>.Ok(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<MessageDto>.Fail(ex.Message));
        }
    }

    [HttpDelete("api/messages/{id}")]
    public async Task<IActionResult> DeleteMessage(string id)
    {
        try
        {
            var chatId = await _mediator.Send(new DeleteMessageCommand(id, UserId));
            await _hubContext.Clients.Group($"chat:{chatId}").SendAsync("MessageDeleted", new { messageId = id, chatId });
            return Ok(ApiResponse<bool>.Ok(true));
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, ApiResponse<object>.Fail(ex.Message));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ApiResponse<bool>.Fail(ex.Message));
        }
    }

    [HttpPost("api/messages/{id}/read")]
    public async Task<IActionResult> MarkRead(string id)
    {
        await _mediator.Send(new MarkMessageReadCommand(id, UserId));
        await _hubContext.Clients.All.SendAsync("MessageRead", new { messageId = id, userId = UserId, readAt = DateTime.UtcNow });
        return Ok(ApiResponse<bool>.Ok(true));
    }

    [HttpPost("api/messages/{id}/reactions")]
    public async Task<IActionResult> AddReaction(string id, [FromBody] AddReactionRequest request)
    {
        var result = await _mediator.Send(new AddReactionCommand(id, UserId, request.Emoji));
        if (result.StartsWith("removed:"))
        {
            var removedEmoji = result.Substring("removed:".Length);
            await _hubContext.Clients.All.SendAsync("ReactionRemoved", new { messageId = id, userId = UserId, emoji = removedEmoji });
        }
        else
        {
            await _hubContext.Clients.All.SendAsync("ReactionAdded", new { messageId = id, userId = UserId, emoji = request.Emoji });
        }
        return Ok(ApiResponse<bool>.Ok(true));
    }

    [HttpDelete("api/messages/{id}/reactions/{emoji}")]
    public async Task<IActionResult> RemoveReaction(string id, string emoji)
    {
        await _mediator.Send(new RemoveReactionCommand(id, UserId, emoji));
        await _hubContext.Clients.All.SendAsync("ReactionRemoved", new { messageId = id, userId = UserId, emoji });
        return Ok(ApiResponse<bool>.Ok(true));
    }
}

using System.Security.Claims;
using CHNUgram.API.Common;
using CHNUgram.API.Features.Auth.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CHNUgram.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        try
        {
            var result = await _mediator.Send(new RegisterCommand(
                request.Email, request.Username, request.DisplayName, request.Password));
            return Ok(ApiResponse<AuthResponse>.Ok(result, "Registration successful. Please verify your email."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<AuthResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        try
        {
            var result = await _mediator.Send(new LoginCommand(request.Email, request.Password));
            return Ok(ApiResponse<AuthResponse>.Ok(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<AuthResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh([FromBody] RefreshRequest request)
    {
        try
        {
            var result = await _mediator.Send(new RefreshTokenCommand(request.RefreshToken));
            return Ok(ApiResponse<AuthResponse>.Ok(result));
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ApiResponse<AuthResponse>.Fail(ex.Message));
        }
    }

    [HttpPost("logout")]
    [Authorize]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        await _mediator.Send(new LogoutCommand(request.RefreshToken, userId));
        return Ok(ApiResponse<bool>.Ok(true, "Logged out successfully."));
    }

    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token)
    {
        try
        {
            await _mediator.Send(new VerifyEmailCommand(token));
            return Ok(ApiResponse<bool>.Ok(true, "Email verified successfully."));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<bool>.Fail(ex.Message));
        }
    }

    [HttpPost("resend-verification")]
    [Authorize]
    public IActionResult ResendVerification()
    {
        return Ok(ApiResponse<bool>.Ok(true, "Verification email sent."));
    }
}

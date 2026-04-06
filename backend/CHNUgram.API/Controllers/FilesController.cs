using System.Security.Claims;
using CHNUgram.API.Common;
using CHNUgram.API.Domain.Entities;
using CHNUgram.API.Infrastructure.Persistence;
using CHNUgram.API.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CHNUgram.API.Controllers;

[ApiController]
[Route("api/files")]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly IFileStorageService _storage;
    private readonly AppDbContext _db;

    public FilesController(IFileStorageService storage, AppDbContext db)
    {
        _storage = storage;
        _db = db;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    [HttpPost("upload")]
    [RequestSizeLimit(50 * 1024 * 1024)] // 50MB
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<AttachmentDto>.Fail("No file provided."));

        var (filePath, publicUrl) = await _storage.SaveFileAsync(file);

        var attachment = new Attachment
        {
            FileName = file.FileName,
            FilePath = filePath,
            FileSize = file.Length,
            MimeType = file.ContentType,
            MessageId = "temp" // Will be updated when attached to a message
        };

        var dto = new AttachmentDto(
            attachment.Id,
            attachment.FileName,
            publicUrl,
            attachment.FileSize,
            attachment.MimeType,
            null, null, null
        );

        return Ok(ApiResponse<AttachmentDto>.Ok(dto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetFile(string id)
    {
        var attachment = await _db.Attachments.FirstOrDefaultAsync(a => a.Id == id);
        if (attachment == null) return NotFound();

        var fullPath = Path.Combine(Directory.GetCurrentDirectory(), attachment.FilePath);
        if (!System.IO.File.Exists(fullPath)) return NotFound();

        var stream = System.IO.File.OpenRead(fullPath);
        return File(stream, attachment.MimeType, attachment.FileName);
    }
}

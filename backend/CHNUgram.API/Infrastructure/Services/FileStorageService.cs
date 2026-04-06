namespace CHNUgram.API.Infrastructure.Services;

public interface IFileStorageService
{
    Task<(string filePath, string publicUrl)> SaveFileAsync(IFormFile file, string folder = "uploads");
    Task DeleteFileAsync(string filePath);
    string GetPublicUrl(string filePath);
}

public class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;
    private readonly string _baseUrl;

    public LocalFileStorageService(IWebHostEnvironment env, IConfiguration config)
    {
        _env = env;
        _config = config;
        _baseUrl = _config["Storage:BaseUrl"] ?? "http://localhost:5000";
    }

    public async Task<(string filePath, string publicUrl)> SaveFileAsync(IFormFile file, string folder = "uploads")
    {
        var uploadsPath = Path.Combine(_env.ContentRootPath, "uploads", folder);
        Directory.CreateDirectory(uploadsPath);

        var ext = Path.GetExtension(file.FileName);
        var fileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(uploadsPath, fileName);

        await using var stream = new FileStream(fullPath, FileMode.Create);
        await file.CopyToAsync(stream);

        var relativePath = $"uploads/{folder}/{fileName}";
        var publicUrl = $"{_baseUrl}/{relativePath}";

        return (relativePath, publicUrl);
    }

    public async Task DeleteFileAsync(string filePath)
    {
        var fullPath = Path.Combine(_env.ContentRootPath, filePath);
        if (File.Exists(fullPath))
        {
            File.Delete(fullPath);
        }
        await Task.CompletedTask;
    }

    public string GetPublicUrl(string filePath)
    {
        return $"{_baseUrl}/{filePath}";
    }
}

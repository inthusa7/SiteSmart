using ConstructionApp.Api.Data;
using ConstructionApp.Api.DTOs;
using ConstructionApp.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ConstructionApp.Api.Services
{
    public class TechnicianService
    {
        private readonly AppDbContext _db;
        private readonly IHttpContextAccessor _http;
        private readonly IConfiguration _config;
        private readonly IWebHostEnvironment _env;

        public TechnicianService(AppDbContext db, IHttpContextAccessor http, IConfiguration config, IWebHostEnvironment env)
        {
            _db = db;
            _http = http;
            _config = config;
            _env = env;
        }

        // Safe getter for logged-in user's DB id
        private int GetUserId()
        {
            var user = _http.HttpContext?.User;
            var claim = user?.FindFirst("UserID") 
                        ?? user?.FindFirst(ClaimTypes.NameIdentifier)
                        ?? user?.FindFirst("sub");
            if (claim == null || !int.TryParse(claim.Value, out var id))
                throw new UnauthorizedAccessException("User not found in token");
            return id;
        }

        // Update profile: user basic fields, address, optional password change
        public async Task<(bool Success, string Message)> UpdateProfileAsync(UpdateTechnicianProfileRequest dto)
        {
            var userId = GetUserId();

            var user = await _db.Users
                .Include(u => u.Technician)
                .FirstOrDefaultAsync(u => u.UserID == userId);

            if (user == null)
                return (false, "User not found");

            // Update basic fields
            user.FullName = dto.FullName?.Trim() ?? user.FullName;
            user.Email = dto.Email?.Trim() ?? user.Email;
            user.Phone = dto.Phone?.Trim() ?? user.Phone;

            // Address: create if missing
            var addr = await _db.Addresses.FirstOrDefaultAsync(a => a.UserID == userId);
            if (addr == null)
            {
                addr = new Address { UserID = userId };
                _db.Addresses.Add(addr);
            }

            if (dto.Address != null)
            {
                addr.Street = dto.Address.Street?.Trim() ?? addr.Street;
                addr.City = dto.Address.City?.Trim() ?? addr.City;
                addr.State = dto.Address.State?.Trim() ?? addr.State;
                addr.PostalCode = dto.Address.PostalCode?.Trim() ?? addr.PostalCode;
                addr.Country = string.IsNullOrWhiteSpace(dto.Address.Country) ? (addr.Country ?? "Sri Lanka") : dto.Address.Country.Trim();
            }

            // Password change (optional)
            if (!string.IsNullOrEmpty(dto.NewPassword))
            {
                if (string.IsNullOrEmpty(dto.CurrentPassword))
                    return (false, "Current password required to change password.");

                // NOTE: uses BCrypt.Net-Next package — add to project if not present
                var ok = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash);
                if (!ok)
                    return (false, "Current password is incorrect.");

                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            }

            await _db.SaveChangesAsync();
            return (true, "Profile updated successfully");
        }

        // Upload avatar file, store in wwwroot/uploads/technicians and save URL in user record
        public async Task<(bool Success, string Message, string? Url)> UploadAvatarAsync(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return (false, "No file uploaded", null);

            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowed.Contains(file.ContentType.ToLowerInvariant()))
                return (false, "Invalid file type", null);

            if (file.Length > 5 * 1024 * 1024)
                return (false, "File too large", null);

            var uploadsFolder = Path.Combine(_env.WebRootPath ?? "wwwroot", "uploads", "technicians");
            Directory.CreateDirectory(uploadsFolder);

            var safeFileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var savePath = Path.Combine(uploadsFolder, safeFileName);

            await using (var stream = new FileStream(savePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var baseUrl = $"{_http.HttpContext?.Request.Scheme}://{_http.HttpContext?.Request.Host}";
            var url = $"{baseUrl}/uploads/technicians/{Uri.EscapeDataString(safeFileName)}";

            // save to DB
            var userId = GetUserId();
            var user = await _db.Users.FindAsync(userId);
            if (user == null)
                return (false, "User not found", null);

            user.ProfileImage = url;
            await _db.SaveChangesAsync();

            return (true, "Uploaded", url);
        }
    }
}

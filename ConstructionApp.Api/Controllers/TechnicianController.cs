
using System.Security.Claims;

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

using ConstructionApp.Api.Services;
using ConstructionApp.Api.DTOs;
using ConstructionApp.Api.Data;
using System.Text.Json;

namespace ConstructionApp.Api.Controllers
{
    [ApiController]
    [Route("api/technician")]
    [Authorize(Roles = "Technician")]
    public class TechnicianController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<TechnicianController> _logger;
        private readonly AppDbContext _context;   // <-- Your real DbContext

        public TechnicianController(
            IUserService userService,
            IWebHostEnvironment env,
            ILogger<TechnicianController> logger,
            AppDbContext context)
        {
            _userService = userService;
            _env = env;
            _logger = logger;
            _context = context;
        }

        // POST api/technician/upload-document
        [HttpPost("upload-document")]
        public async Task<IActionResult> UploadDocuments(
            [FromForm] IFormFile? nic,
            [FromForm] IFormFile? certificate,
            [FromForm] string? street,
            [FromForm] string? city,
            [FromForm] string? state,
            [FromForm] string? postalCode,
            [FromForm] string? country,
            [FromForm] int? experienceYears,
            [FromForm] string? categories,
            [FromForm] string? categoriesJson
        )
        {
            var userIdClaim =
                User.FindFirst("UserID") ??
                User.FindFirst(ClaimTypes.NameIdentifier) ??
                User.FindFirst("sub");

            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { success = false, message = "Unable to determine user from token" });

            try
            {
                await using var tx = await _context.Database.BeginTransactionAsync();

                // Ensure technician exists
                var tech = await _context.Technicians.FirstOrDefaultAsync(t => t.UserID == userId);
                if (tech == null)
                {
                    tech = new ConstructionApp.Api.Models.Technician
                    {
                        UserID = userId,
                        VerificationStatus = "Pending"
                    };
                    _context.Technicians.Add(tech);
                    await _context.SaveChangesAsync();
                }

                // Helper to save files
                string? SaveFile(IFormFile? file, string folderName)
                {
                    if (file == null || file.Length == 0) return null;

                    var webRoot = _env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
                    var folder = Path.Combine(webRoot, "uploads", "technicians", userId.ToString(), folderName);
                    Directory.CreateDirectory(folder);

                    var safeName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
                    var fullPath = Path.Combine(folder, safeName);

                    using var fs = new FileStream(fullPath, FileMode.Create);
                    file.CopyTo(fs);

                    return $"/uploads/technicians/{userId}/{folderName}/{safeName}";
                }

                var nicPath = SaveFile(nic, "idproof");
                var certPath = SaveFile(certificate, "certificate");

                if (nicPath != null) tech.IDProof = nicPath;
                if (certPath != null) tech.Certificate = certPath;
                if (experienceYears.HasValue) tech.ExperienceYears = experienceYears.Value;

                _context.Technicians.Update(tech);
                await _context.SaveChangesAsync();

                // Address Upsert
                var addr = await _context.Addresses.FirstOrDefaultAsync(a => a.UserID == userId);
                if (addr == null)
                {
                    addr = new ConstructionApp.Api.Models.Address
                    {
                        UserID = userId,
                        Street = street ?? "",
                        City = city ?? "",
                        State = state ?? "",
                        PostalCode = postalCode ?? "",
                        Country = string.IsNullOrWhiteSpace(country) ? "Sri Lanka" : country,
                        IsDefault = true
                    };
                    _context.Addresses.Add(addr);
                }
                else
                {
                    addr.Street = street ?? addr.Street;
                    addr.City = city ?? addr.City;
                    addr.State = state ?? addr.State;
                    addr.PostalCode = postalCode ?? addr.PostalCode;
                    addr.Country = string.IsNullOrWhiteSpace(country) ? addr.Country : country!;
                }
                await _context.SaveChangesAsync();

                // Category linking
                var rawCats = !string.IsNullOrWhiteSpace(categoriesJson) ? categoriesJson : categories;
                var categoryNames = new List<string>();

                if (!string.IsNullOrWhiteSpace(rawCats))
                {
                    try
                    {
                        categoryNames = JsonSerializer.Deserialize<List<string>>(rawCats) ?? new List<string>();
                    }
                    catch
                    {
                        categoryNames = rawCats.Split(',', StringSplitOptions.RemoveEmptyEntries)
                                               .Select(c => c.Trim())
                                               .ToList();
                    }
                }

                foreach (var catName in categoryNames)
                {
                    var category = await _context.Categories.FirstOrDefaultAsync(c => c.CategoryName == catName);
                    if (category == null) continue;

                    var exists = await _context.TechnicianCategories
                        .AnyAsync(tc => tc.TechnicianID == tech.TechnicianID && tc.CategoryID == category.CategoryID);

                    if (!exists)
                    {
                        _context.TechnicianCategories.Add(new ConstructionApp.Api.Models.TechnicianCategory
                        {
                            TechnicianID = tech.TechnicianID,
                            CategoryID = category.CategoryID,
                            IsActive = true
                        });
                    }
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                return Ok(new
                {
                    success = true,
                    message = "Verification data saved",
                    data = new
                    {
                        idProof = tech.IDProof,
                        cert = tech.Certificate,
                        experienceYears = tech.ExperienceYears
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UploadDocuments failed for technician");
                return StatusCode(500, new { success = false, message = "Upload failed", detail = ex.Message });
            }
        }

        // ---------------------------------------------------------------------------------------
        // UPDATE PROFILE
        // ---------------------------------------------------------------------------------------
        [HttpPut("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest dto)
        {
            if (dto == null)
                return BadRequest(new { success = false, message = "Invalid request" });

            var userIdClaim =
                User.FindFirst("UserID") ??
                User.FindFirst(ClaimTypes.NameIdentifier) ??
                User.FindFirst("sub");

            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { success = false, message = "Unable to determine user" });

            try
            {
                // 🔧 FIX for CS8130: specify types explicitly
                (bool success, string message) = await _userService.UpdateProfileAsync(userId, dto);

                if (!success)
                    return BadRequest(new { success = false, message });

                return Ok(new { success = true, message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Profile update failed for user {UserId}", userId);
                return StatusCode(500, new { success = false, message = "Profile update failed" });
            }
        }

        // ---------------------------------------------------------------------------------------
        // UPLOAD AVATAR
        // ---------------------------------------------------------------------------------------
        [HttpPost("upload-avatar")]
        public async Task<IActionResult> UploadAvatar([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "No file uploaded" });

            var allowed = new[] { "image/jpeg", "image/png", "image/webp" };
            if (!allowed.Contains(file.ContentType?.ToLowerInvariant() ?? ""))
                return BadRequest(new { success = false, message = "Invalid image format" });

            try
            {
                // Save file
                var folder = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "technician", "profile-image");
                Directory.CreateDirectory(folder);

                var ext = Path.GetExtension(file.FileName);
                var fileName = $"{Guid.NewGuid()}{(string.IsNullOrEmpty(ext) ? ".png" : ext)}";
                var filePath = Path.Combine(folder, fileName);

                await using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var imageUrl = $"{Request.Scheme}://{Request.Host}/technician/profile-image/{fileName}";

                // Get user id from token (robust)
                var idClaim =
                    User.FindFirst("UserID") ??
                    User.FindFirst(ClaimTypes.NameIdentifier) ??
                    User.FindFirst("sub");

                if (idClaim == null || !int.TryParse(idClaim.Value, out var userId))
                {
                    _logger.LogWarning("UploadAvatar: no user id claim present in token.");
                    return Unauthorized(new { success = false, message = "Invalid token: user id missing" });
                }

                // Load user from DB
                var user = await _context.Users.FindAsync(userId);
                if (user == null)
                {
                    _logger.LogWarning("UploadAvatar: user not found. id={UserId}", userId);
                    return NotFound(new { success = false, message = "User not found" });
                }

                // Update and save
                user.ProfileImage = imageUrl;
                var changes = await _context.SaveChangesAsync();

                if (changes <= 0)
                {
                    _logger.LogError("UploadAvatar: SaveChangesAsync returned 0 changes for user {UserId}", userId);
                    return StatusCode(500, new { success = false, message = "Failed to update database" });
                }

                return Ok(new { success = true, message = "Avatar uploaded", data = new { url = imageUrl } });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "UploadAvatar error");
                return StatusCode(500, new { success = false, message = "Server error: " + ex.Message });
            }
        }

        [Authorize]
        [HttpGet("my-address")]
        public async Task<IActionResult> GetMyAddress()
        {
            var userIdClaim =
                User.FindFirst("UserID") ??
                User.FindFirst(ClaimTypes.NameIdentifier) ??
                User.FindFirst("sub");

            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
                return Unauthorized(new { success = false, message = "Unable to determine user" });

            var addr = await _context.Addresses.FirstOrDefaultAsync(a => a.UserID == userId);

            if (addr == null)
                return Ok(null);

            return Ok(new
            {
                street = addr.Street,
                city = addr.City,
                state = addr.State,
                postalCode = addr.PostalCode,
                country = addr.Country
            });
        }
    }
}

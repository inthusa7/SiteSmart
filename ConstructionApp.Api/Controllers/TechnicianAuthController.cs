
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using ConstructionApp.Api.Data;
using ConstructionApp.Api.DTOs;
using ConstructionApp.Api.Models;
using ConstructionApp.Api.Helpers;
using ConstructionApp.Api.Services; // for IEmailService

namespace ConstructionApp.Api.Controllers
{
    [ApiController]
    [Route("api/technician/auth")]
    public class TechnicianAuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly JwtTokenHelper _jwt;
        private readonly IEmailService _email;

        public TechnicianAuthController(AppDbContext db, JwtTokenHelper jwt, IEmailService email)
        {
            _db = db;
            _jwt = jwt;
            _email = email;
        }

        // Registers a new user with Role = "Technician" and creates a Technician row
        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (dto == null)
                return BadRequest(new ApiResponseDto { Success = false, Message = "Request body is required" });

            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
                return BadRequest(new ApiResponseDto { Success = false, Message = "Email and password required" });

            var emailLower = dto.Email.Trim().ToLower();

            if (await _db.Users.AnyAsync(u => u.Email.ToLower() == emailLower))
                return Conflict(new ApiResponseDto { Success = false, Message = "Email already exists" });

            // create user
            var user = new User
            {
                FullName = dto.FullName?.Trim() ?? "Technician",
                Email = emailLower,
                Phone = dto.Phone?.Trim(),
                PasswordHash = PasswordHasher.Hash(dto.Password),
                Role = "Technician",
                Status = "Active",
                EmailConfirmed = false,
                VerificationToken = Guid.NewGuid().ToString(),
                TokenExpires = DateTime.UtcNow.AddHours(24),
                CreatedAt = DateTime.UtcNow
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            // create technician profile
            var tech = new Technician
            {
                UserID = user.UserID,
                ProfileImage = null,
                ExperienceYears = 0,
                RatingAverage = 0.0m,
                TotalRatings = 0,
                AvailabilityStatus = "Available",
                WalletBalance = 0.00m,
                TotalJobsCompleted = 0,
                VerificationStatus = "Pending",
                VerifiedAt = null
            };

            _db.Technicians.Add(tech);
            await _db.SaveChangesAsync();

            // send verification email (best-effort)
            try
            {
                var verifyUrl = $"{Request.Scheme}://{Request.Host}/api/auth/verify/{user.VerificationToken}";
                await _email.SendEmailAsync(
                    user.Email,
                    "Verify your Technician account",
                    $"<h3>Welcome {user.FullName}</h3><p>Please verify your email by clicking below:</p><a href='{verifyUrl}'>Verify Email</a>"
                );
            }
            catch
            {
                // swallow email exceptions, but still return success with a note
                return Ok(new ApiResponseDto
                {
                    Success = true,
                    Message = "Registered successfully. Failed to send verification email - contact admin to verify.",
                    Data = new { userId = user.UserID, technicianId = tech.TechnicianID }
                });
            }

            return Ok(new ApiResponseDto
            {
                Success = true,
                Message = "Registered successfully. Check your email to verify your account.",
                Data = new { userId = user.UserID, technicianId = tech.TechnicianID }
            });
        }

        // TechnicianAuthController.cs -> Login method (replace current method)
[HttpPost("login")]
[AllowAnonymous]
public async Task<IActionResult> Login([FromBody] LoginDto dto)
{
    if (dto == null || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        return BadRequest(new ApiResponseDto { Success = false, Message = "Email and password required" });

    var lookup = dto.Email.Trim().ToLower();

    var user = await _db.Users
        .Include(u => u.Technician)
        .FirstOrDefaultAsync(u =>
            u.Email.ToLower() == lookup || (u.Phone != null && u.Phone == dto.Email.Trim()));

    if (user == null)
        return Ok(new ApiResponseDto { Success = false, Message = "Invalid credentials" });

    if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        return Ok(new ApiResponseDto { Success = false, Message = "Invalid credentials" });

    // *** Allow login if email confirmed even if Technician.VerificationStatus is Pending ***
    if (!user.EmailConfirmed)
        return Ok(new ApiResponseDto { Success = false, Message = "Please verify your email first" });

    // prepare verification status to return
    var verificationStatus = user.Technician?.VerificationStatus ?? "Pending";

    var token = _jwt.GenerateToken(user);

    return Ok(new ApiResponseDto
    {
        Success = true,
        Message = "Login successful",
        Data = new
        {
            token,
            userId = user.UserID,
            technicianId = user.Technician?.TechnicianID,
            fullName = user.FullName,
            role = user.Role,
            verificationStatus // "Pending" / "Verified" / "Rejected"
        }
    });
}


        // GET: /api/technician/auth/profile
        // Protected endpoint to get tech profile
        [HttpGet("profile")]
        [Authorize] // ensures token present; you can refine to [Authorize(Roles = "Technician")]
        public async Task<IActionResult> Profile()
        {
            try
            {
                // Use the extension helper to get user id from token
                var userId = User.GetUserId();

                var user = await _db.Users
                    .Include(u => u.Technician)
                    .Where(u => u.UserID == userId)
                    .Select(u => new
                    {
                        u.UserID,
                        u.FullName,
                        u.Email,
                        u.Phone,
                        u.Role,
                        u.EmailConfirmed,
                        Technician = u.Technician == null ? null : new
                        {
                            u.Technician.TechnicianID,
                            u.Technician.ProfileImage,
                            u.Technician.ExperienceYears,
                            u.Technician.RatingAverage,
                            u.Technician.TotalRatings,
                            u.Technician.AvailabilityStatus,
                            u.Technician.WalletBalance,
                            u.Technician.TotalJobsCompleted,
                            u.Technician.VerificationStatus,
                            u.Technician.VerifiedAt
                        }
                    })
                    .FirstOrDefaultAsync();

                if (user == null)
                    return NotFound(new ApiResponseDto { Success = false, Message = "User not found" });

                return Ok(new ApiResponseDto { Success = true, Message = "Profile fetched", Data = user });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new ApiResponseDto { Success = false, Message = "Invalid token" });
            }
        }

        // POST: /api/technician/auth/resend-verification
        [HttpPost("resend-verification")]
        [AllowAnonymous]
        public async Task<IActionResult> ResendVerification([FromBody] ResendDto dto)
        {
            if (dto == null || string.IsNullOrWhiteSpace(dto.Email))
                return BadRequest(new ApiResponseDto { Success = false, Message = "Email is required" });

            var emailLower = dto.Email.Trim().ToLower();
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == emailLower);

            if (user == null)
                return Ok(new ApiResponseDto { Success = false, Message = "No account associated with this email" });

            if (user.EmailConfirmed)
                return Ok(new ApiResponseDto { Success = false, Message = "Email already confirmed" });

            user.VerificationToken = Guid.NewGuid().ToString();
            user.TokenExpires = DateTime.UtcNow.AddHours(24);

            await _db.SaveChangesAsync();

            try
            {
                var verifyUrl = $"{Request.Scheme}://{Request.Host}/api/auth/verify/{user.VerificationToken}";
                await _email.SendEmailAsync(
                    user.Email,
                    "Verify your email",
                    $"<p>Please verify your email by clicking below:</p><a href='{verifyUrl}'>Verify Email</a>"
                );

                return Ok(new ApiResponseDto { Success = true, Message = "Verification email sent" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new ApiResponseDto { Success = false, Message = "Failed to send email", Data = ex.Message });
            }
        }
    }
}

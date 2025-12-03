using ConstructionApp.Api.Data;
using ConstructionApp.Api.DTOs;
using ConstructionApp.Api.Models;
using ConstructionApp.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using ConstructionApp.Api.Helpers;

namespace ConstructionApp.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IEmailService _email;
        private readonly JwtTokenHelper _jwt;

        public AuthController(AppDbContext db, IEmailService email, JwtTokenHelper jwt)
        {
            _db = db;
            _email = email;
            _jwt = jwt;
        }

        // ====================================
        // LOGIN
        // ====================================
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
            if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
                return Ok(new AuthResponseDto { Success = false, Message = "Invalid email or password" });

            if (!user.EmailConfirmed)
                return Ok(new AuthResponseDto { Success = false, Message = "Verify your email first" });

            var token = _jwt.GenerateToken(user);

            return Ok(new AuthResponseDto
            {
                Success = true,
                Message = "Login successful",
                Token = token,
                Role = user.Role
            });
        }

        // ====================================
        // REGISTER
        // ====================================
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (await _db.Users.AnyAsync(u => u.Email == dto.Email))
                return Ok(new AuthResponseDto { Success = false, Message = "Email already exists" });

            var user = new User
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role ?? "Customer",
                EmailConfirmed = false,
                VerificationToken = Guid.NewGuid().ToString(),
                TokenExpires = DateTime.UtcNow.AddHours(24)
            };

            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            // Correct verify URL
            var verifyUrl = $"{Request.Scheme}://{Request.Host}/api/auth/verify/{user.VerificationToken}";

            await _email.SendEmailAsync(
                dto.Email!,
                "Verify Your Email",
                $"<h2>Email Verification</h2><p>Click below:</p><a href='{verifyUrl}'>Verify Email</a>"
            );

            return Ok(new AuthResponseDto
            {
                Success = true,
                Message = "Registration successful. Check your email to verify your account.",
                RedirectUrl = "/verify"
            });
        }

        // ====================================
        // VERIFY EMAIL
        // ====================================
        [HttpGet("verify/{token}")]
        public async Task<IActionResult> VerifyEmail(string token)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.VerificationToken == token);

            if (user == null || user.TokenExpires < DateTime.UtcNow)
                return Ok(new AuthResponseDto { Success = false, Message = "Invalid or expired token" });

            user.EmailConfirmed = true;
            user.VerificationToken = null;
            user.TokenExpires = null;

            await _db.SaveChangesAsync();

            var jwt = _jwt.GenerateToken(user);

            return Ok(new AuthResponseDto
            {
                Success = true,
                Message = "Email verified successfully",
                Token = jwt,
                Role = user.Role
            });
        }

        [HttpPost("forgot")]
        public async Task<IActionResult> Forgot([FromBody] ForgotDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Email))
                return Ok(new AuthResponseDto { Success = false, Message = "Email is required." });

            // find user
            var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);

            // Always return generic success to avoid revealing user existence
            if (user == null)
            {
                return Ok(new AuthResponseDto { Success = true, Message = "If that email exists we sent a reset link." });
            }

            // create single-use token & expiry
            user.VerificationToken = Guid.NewGuid().ToString("N");
            user.TokenExpires = DateTime.UtcNow.AddHours(2);
            await _db.SaveChangesAsync();

            // Build a frontend reset URL (adjust path to your frontend route)
            // e.g. https://app.example.com/reset-password?token=...
            var resetUrl = $"{Request.Scheme}://{Request.Host}/reset-password?token={user.VerificationToken}";

            var html = $@"
            <h2>Password Reset Request</h2>
            <p>We received a request to reset the password for <strong>{user.Email}</strong>.</p>
            <p>Click the link below to reset your password (valid for 2 hours):</p>
            <p><a href='{resetUrl}'>Reset your password</a></p>
            <p>If you didn't request this, you can safely ignore this email.</p>
            ";

            await _email.SendEmailAsync(user.Email, "Reset your password", html);

            return Ok(new AuthResponseDto { Success = true, Message = "If that email exists we sent a reset link." });
        }


        // ====================================
        // RESET PASSWORD
        // ====================================
        [HttpPost("reset")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetDto dto)
        {
            var user = await _db.Users.FirstOrDefaultAsync(u => u.VerificationToken == dto.Token);

            if (user == null || user.TokenExpires < DateTime.UtcNow)
                return Ok(new AuthResponseDto { Success = false, Message = "Invalid or expired token" });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            user.VerificationToken = null;
            user.TokenExpires = null;

            await _db.SaveChangesAsync();

            var jwt = _jwt.GenerateToken(user);

            return Ok(new AuthResponseDto
            {
                Success = true,
                Message = "Password reset successful",
                Token = jwt
            });
        }
    }
}

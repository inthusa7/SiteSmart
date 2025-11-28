// File: Controllers/TechnicianManagementController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApp.Api.Data;
using ConstructionApp.Api.DTOs;

[ApiController]
[Route("api/admin/technicians")]
[Authorize(Roles = "Admin")]
public class TechnicianManagementController : ControllerBase
{
    private readonly AppDbContext _db;
    public TechnicianManagementController(AppDbContext db) => _db = db;

    // GET: api/admin/technicians/pending
    [HttpGet("pending")]
    public async Task<IActionResult> GetPending()
    {
        var list = await _db.Technicians
            .Include(t => t.User)
            .Where(t => t.VerificationStatus == "Pending")
            .Select(t => new {
                t.TechnicianID, t.UserID, t.User.FullName, t.User.Email, t.ExperienceYears, t.VerificationStatus
            }).ToListAsync();

        return Ok(new ApiResponseDto { Success = true, Data = list });
    }

    // POST: api/admin/technicians/verify/{id}
    [HttpPost("verify/{id}")]
    public async Task<IActionResult> Verify(int id)
    {
        var tech = await _db.Technicians.Include(t => t.User).FirstOrDefaultAsync(t => t.TechnicianID == id);
        if (tech == null) return NotFound(new ApiResponseDto { Success = false, Message = "Technician not found" });

        tech.VerificationStatus = "Verified";
        tech.VerifiedAt = DateTime.UtcNow;
        tech.User.EmailConfirmed = true; // optional
        await _db.SaveChangesAsync();

        return Ok(new ApiResponseDto { Success = true, Message = "Technician verified" });
    }
}

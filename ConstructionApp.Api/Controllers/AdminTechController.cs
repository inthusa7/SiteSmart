// Controllers/AdminTechController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApp.Api.Data;
using System.Threading.Tasks;
using ConstructionApp.Api.Services;

[ApiController]
[Route("api/admin/tech-requests")]
[Authorize(Roles = "Admin")]
public class AdminTechController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly EmailService _email; // use your email type

    public AdminTechController(AppDbContext db, EmailService email)
    {
        _db = db;
        _email = email;
    }

    // GET /api/admin/tech-requests?page=1&size=20
    [HttpGet]
    public async Task<IActionResult> ListPending([FromQuery] int page = 1, [FromQuery] int size = 20)
    {
        if (page < 1) page = 1;
        if (size < 1) size = 20;

        var q = _db.Technicians
            .AsNoTracking()
            .Include(t => t.User)
            .Where(t => t.VerificationStatus == "Pending");

        var total = await q.CountAsync();

        var items = await q
            .OrderBy(t => t.TechnicianID)
            .Skip((page - 1) * size)
            .Take(size)
            .Select(t => new {
                technicianId = t.TechnicianID,
                userId = t.UserID,
                fullName = t.User.FullName,
                email = t.User.Email,
                phone = t.User.Phone,
                submittedAt = t.User.CreatedAt,
                verificationStatus = t.VerificationStatus
            }).ToListAsync();

        return Ok(new { success = true, total, page, size, items });
    }

    // GET /api/admin/tech-requests/{id}
    [HttpGet("{technicianId:int}")]
    public async Task<IActionResult> GetRequest(int technicianId)
    {
        var t = await _db.Technicians
            .AsNoTracking()
            .Include(x => x.User)
            .Where(x => x.TechnicianID == technicianId)
            .Select(x => new {
                technicianId = x.TechnicianID,
                userId = x.UserID,
                fullName = x.User.FullName,
                email = x.User.Email,
                phone = x.User.Phone,
                submittedAt = x.User.CreatedAt,
                verificationStatus = x.VerificationStatus,
                // If you have documents in another table, include them here.
                documents = new [] { new { fileName = x.ProfileImage ?? "", url = x.ProfileImage ?? "" } }
            })
            .FirstOrDefaultAsync();

        if (t == null) return NotFound(new { success = false, message = "Not found" });
        return Ok(new { success = true, item = t });
    }

    // POST /api/admin/tech-requests/{id}/approve
    [HttpPost("{technicianId:int}/approve")]
    public async Task<IActionResult> Approve(int technicianId, [FromBody] ApproveRejectDto dto)
    {
        var tech = await _db.Technicians.Include(t => t.User).FirstOrDefaultAsync(t => t.TechnicianID == technicianId);
        if (tech == null) return NotFound(new { success = false, message = "Technician not found" });

        tech.VerificationStatus = "Verified";
        tech.VerifiedAt = DateTime.UtcNow;
        tech.User.Status = "Active";

        await _db.SaveChangesAsync();

        // optional: notify
        try {
            await _email.SendEmailAsync(tech.User.Email, "Application approved", $"Hello {tech.User.FullName}, your application has been approved. {dto?.comment ?? ""}");
        } catch { /* ignore/log */ }

        return Ok(new { success = true, message = "Approved" });
    }

    // POST /api/admin/tech-requests/{id}/reject
    [HttpPost("{technicianId:int}/reject")]
    public async Task<IActionResult> Reject(int technicianId, [FromBody] ApproveRejectDto dto)
    {
        var tech = await _db.Technicians.Include(t => t.User).FirstOrDefaultAsync(t => t.TechnicianID == technicianId);
        if (tech == null) return NotFound(new { success = false, message = "Technician not found" });

        tech.VerificationStatus = "Rejected";
        tech.User.Status = "Inactive";

        await _db.SaveChangesAsync();

        try {
            await _email.SendEmailAsync(tech.User.Email, "Application rejected", $"Hello {tech.User.FullName}, your application was rejected. Reason: {dto?.comment ?? "No reason provided."}");
        } catch { /* ignore/log */ }

        return Ok(new { success = true, message = "Rejected" });
    }

    public class ApproveRejectDto { public string? comment { get; set; } }
}
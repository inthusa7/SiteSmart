using ConstructionApp.Api.Data;
using ConstructionApp.Api.Helpers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConstructionApp.Api.Controllers
{
    [ApiController]
    [Route("api/technician/jobs")]
    [Authorize(Roles = "Technician")]
    public class TechnicianJobsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public TechnicianJobsController(AppDbContext db)
        {
            _db = db;
        }

        private async Task<bool> IsVerified(int techId)
        {
            var tech = await _db.Technicians.FirstOrDefaultAsync(t => t.TechnicianID == techId);
            return tech != null && tech.VerificationStatus == "Verified";
        }

        [HttpGet("assigned")]
        public async Task<IActionResult> GetAssigned()
        {
            int techId = int.Parse(User.FindFirst("technicianId")!.Value);

            var jobs = await _db.Bookings
               .Where(b => b.TechnicianID == techId)
               .Select(b => new
               {
                   b.BookingID,
                   b.Description,
                   b.Status,
                   b.TotalAmount,
                   b.ServiceName,
                   b.PreferredStartDateTime,
                   b.PreferredEndDateTime
               })
               .ToListAsync();

            return Ok(new { success = true, data = jobs });
        }

       [HttpPost("{bookingId}/accept")]
public async Task<IActionResult> Accept(int bookingId)
{
    int techId = int.Parse(User.FindFirst("technicianId")!.Value);
    var tech = await _db.Technicians.FirstOrDefaultAsync(t => t.TechnicianID == techId);
    if (tech == null) return NotFound();

    if (tech.VerificationStatus != "Verified")
        return Forbid("Admin verification required to accept jobs.");

    var booking = await _db.Bookings.FindAsync(bookingId);
    if (booking == null) return NotFound();

    booking.TechnicianID = techId;
    booking.Status = "Accepted";
    await _db.SaveChangesAsync();

    return Ok(new { success = true, message = "Booking accepted" });
}


        [HttpPost("{bookingId}/status/{status}")]
        public async Task<IActionResult> UpdateStatus(int bookingId, string status)
        {
            int techId = int.Parse(User.FindFirst("technicianId")!.Value);

            if (!await IsVerified(techId))
                return Forbid("Admin verification required to update job status.");

            var booking = await _db.Bookings.FindAsync(bookingId);
            if (booking == null) return NotFound();

            booking.Status = status;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Status updated" });
        }
    }
}

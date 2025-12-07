using ConstructionApp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConstructionApp.Api.Controllers
{
    [ApiController]
    [Route("api/bookings/admin")]
    [Authorize(Roles = "Admin")]
    public class AdminBookingsController : ControllerBase
    {
      private readonly AppDbContext _db;

      public AdminBookingsController(AppDbContext db)
      {
          _db = db;
      }

      // GET: /api/bookings/admin/all
      [HttpGet("all")]
      public async Task<IActionResult> GetAll()
      {
          var items = await _db.Bookings
              .AsNoTracking()
              .Include(b => b.Service)
              .Include(b => b.User)                         // customer
              .Include(b => b.Technician)
                  .ThenInclude(t => t.User)                 // technician user
              .OrderByDescending(b => b.BookingDate)
              .Select(b => new
              {
                  bookingID = b.BookingID,
                  serviceName = b.Service.ServiceName,
                  customerName = b.User.FullName,
                  technicianName = b.Technician != null
                      ? b.Technician.User.FullName
                      : null,
                  totalAmount = b.TotalAmount,
                  status = b.Status,
                  preferredStartDateTime = b.PreferredStartDateTime,
                  preferredEndDateTime = b.PreferredEndDateTime
              })
              .ToListAsync();

          return Ok(new
          {
              success = true,
              data = items
          });
      }
    }
}

using System.Security.Claims;
using ConstructionApp.Api.Data;
using ConstructionApp.Api.DTOs;       
using ConstructionApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConstructionApp.Api.Controllers
{
    [ApiController]
    [Route("api/admin/notifications")]
    [Authorize(Roles = "Admin")]
    public class AdminNotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly NotificationService _notifService;

        public AdminNotificationsController(AppDbContext db, NotificationService notifService)
        {
            _db = db;
            _notifService = notifService;
        }

        private int? GetCurrentUserId()
        {
            var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return int.TryParse(idStr, out var id) ? id : null;
        }

        // POST: /api/admin/notifications
        [HttpPost]
public async Task<IActionResult> Create([FromBody] CreateNotificationDto dto)
{
    try
    {
        var adminId = GetCurrentUserId();
        var n = await _notifService.CreateAsync(dto, adminId);

        return Ok(new
        {
            success = true,
            message = "Notification created",
            data = new
            {
                n.NotificationID,
                n.Title,
                n.Message,
                n.Category,
                n.TargetType,
                n.TargetRole,
                n.TargetUserID,
                n.CreatedAt
            }
        });
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new { success = false, message = ex.Message });
    }
    catch (Exception ex) // 👈 debug version
    {
        // ❗ DEV only: send full error to client so we can see it
        return StatusCode(500, new
        {
            success = false,
            message = ex.Message,
            detail = ex.ToString()
        });
    }
}


        // Optional: List notifications (for admin UI)
        // GET: /api/admin/notifications?category=&page=&size=
        [HttpGet]
        public async Task<IActionResult> List([FromQuery] string? category, [FromQuery] int page = 1, [FromQuery] int size = 20)
        {
            if (page < 1) page = 1;
            if (size < 1) size = 20;

            var q = _db.Notifications.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(category))
            {
                q = q.Where(n => n.Category == category);
            }

            var total = await q.CountAsync();

            var items = await q
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * size)
                .Take(size)
                .Select(n => new
                {
                    n.NotificationID,
                    n.Title,
                    n.Message,
                    n.Category,
                    n.TargetType,
                    n.TargetRole,
                    n.TargetUserID,
                    n.CreatedAt
                })
                .ToListAsync();

            return Ok(new { success = true, total, page, size, items });
        }
    }
}

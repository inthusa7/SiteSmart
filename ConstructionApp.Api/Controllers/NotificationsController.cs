using System.Security.Claims;
using ConstructionApp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ConstructionApp.Api.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public NotificationsController(AppDbContext db)
        {
            _db = db;
        }

        private int GetCurrentUserId()
        {
            var idStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(idStr, out var id)) return id;
            throw new Exception("Invalid user id");
        }

        // GET: /api/notifications/my?unreadOnly=true
        [HttpGet("my")]
        public async Task<IActionResult> MyNotifications([FromQuery] bool unreadOnly = false)
        {
            var userId = GetCurrentUserId();

            var q = _db.NotificationUsers
                .AsNoTracking()
                .Include(nu => nu.Notification)
                .Where(nu => nu.UserID == userId);

            if (unreadOnly)
            {
                q = q.Where(nu => !nu.IsRead);
            }

            var items = await q
                .OrderByDescending(nu => nu.Notification.CreatedAt)
                .Select(nu => new
                {
                    notificationUserId = nu.NotificationUserID,
                    notificationId = nu.NotificationID,
                    title = nu.Notification.Title,
                    message = nu.Notification.Message,
                    category = nu.Notification.Category,
                    isRead = nu.IsRead,
                    createdAt = nu.Notification.CreatedAt,
                    readAt = nu.ReadAt
                })
                .ToListAsync();

            return Ok(new { success = true, items });
        }

        // POST: /api/notifications/{notificationUserId}/read
        [HttpPost("{notificationUserId:int}/read")]
        public async Task<IActionResult> MarkRead(int notificationUserId)
        {
            var userId = GetCurrentUserId();

            var nu = await _db.NotificationUsers
                .FirstOrDefaultAsync(x => x.NotificationUserID == notificationUserId && x.UserID == userId);

            if (nu == null)
                return NotFound(new { success = false, message = "Notification not found" });

            if (!nu.IsRead)
            {
                nu.IsRead = true;
                nu.ReadAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
            }

            return Ok(new { success = true, message = "Marked as read" });
        }
    }
}

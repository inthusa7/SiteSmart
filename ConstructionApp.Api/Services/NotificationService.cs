using ConstructionApp.Api.Data;
using ConstructionApp.Api.DTOs;
using ConstructionApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ConstructionApp.Api.Services
{
    public class NotificationService
    {
        private readonly AppDbContext _db;

        public NotificationService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<Notification> CreateAsync(CreateNotificationDto dto, int? adminUserId)
        {
            if (dto == null)
                throw new ArgumentNullException(nameof(dto));

            if (string.IsNullOrWhiteSpace(dto.Title))
                throw new ArgumentException("Title is required");

            if (string.IsNullOrWhiteSpace(dto.Message))
                throw new ArgumentException("Message is required");

            var targetType = string.IsNullOrWhiteSpace(dto.TargetType)
                ? "All"
                : dto.TargetType;

            var notif = new Notification
            {
                Title = dto.Title.Trim(),
                Message = dto.Message.Trim(),
                Category = dto.Category,
                TargetType = targetType,
                TargetRole = dto.TargetRole,
                TargetUserID = dto.TargetUserId,
                CreatedAt = DateTime.UtcNow,
                CreatedByAdminID = adminUserId
            };

            await _db.Notifications.AddAsync(notif);
            await _db.SaveChangesAsync(); // get NotificationID

            // decide target users
            var userIds = new List<int>();

            if (targetType == "All")
            {
                userIds = await _db.Users
                    .Where(u => u.Status == "Active")
                    .Select(u => u.UserID)
                    .ToListAsync();
            }
            else if (targetType == "Role" && !string.IsNullOrWhiteSpace(dto.TargetRole))
            {
                userIds = await _db.Users
                    .Where(u => u.Status == "Active" && u.Role == dto.TargetRole)
                    .Select(u => u.UserID)
                    .ToListAsync();
            }
            else if (targetType == "User" && dto.TargetUserId.HasValue)
            {
                userIds.Add(dto.TargetUserId.Value);
            }

            foreach (var uid in userIds.Distinct())
            {
                _db.NotificationUsers.Add(new NotificationUser
                {
                    NotificationID = notif.NotificationID,
                    UserID = uid,
                    IsRead = false
                });
            }

            if (userIds.Count > 0)
                await _db.SaveChangesAsync();

            return notif;
        }
    }
}

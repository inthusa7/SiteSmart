using ConstructionApp.Api.DTOs;
using ConstructionApp.Api.Services;

namespace ConstructionApp.Api.System
{
    public class SystemNotifier
    {
        private readonly NotificationService _notifications;

        public SystemNotifier(NotificationService notifications)
        {
            _notifications = notifications;
        }

        // 🔥 Technician low balance
        public async Task NotifyTechnicianLowBalance(int userId, decimal balance)
        {
            await _notifications.CreateAsync(new CreateNotificationDto
            {
                Title = "Low Wallet Balance",
                Message = $"Your wallet balance is low: {balance}. Please recharge.",
                Category = "System",
                TargetType = "User",
                TargetUserId = userId
            }, null);
        }

        // 🔥 Customer booking confirmation
        public async Task NotifyCustomerBooking(int userId, int bookingId)
        {
            await _notifications.CreateAsync(new CreateNotificationDto
            {
                Title = "Booking Confirmed",
                Message = $"Thank you for choosing our service! Your booking #{bookingId} is confirmed.",
                Category = "Booking",
                TargetType = "User",
                TargetUserId = userId
            }, null);
        }

        // 🔥 Technician verification (optional)
        public async Task NotifyTechnicianVerified(int userId)
        {
            await _notifications.CreateAsync(new CreateNotificationDto
            {
                Title = "Verification Approved",
                Message = "Congratulations! Your technician verification has been approved.",
                Category = "System",
                TargetType = "User",
                TargetUserId = userId
            }, null);
        }

        // 🔥 Technician rejected (optional)
        public async Task NotifyTechnicianRejected(int userId, string reason)
        {
            await _notifications.CreateAsync(new CreateNotificationDto
            {
                Title = "Verification Rejected",
                Message = $"Your technician application was rejected. Reason: {reason}",
                Category = "System",
                TargetType = "User",
                TargetUserId = userId
            }, null);
        }
    }
}

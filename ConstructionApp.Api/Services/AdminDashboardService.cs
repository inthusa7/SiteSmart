// Services/AdminDashboardService.cs
using ConstructionApp.Api.Data;
using ConstructionApp.Api.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ConstructionApp.Api.Services
{
    public class AdminDashboardService
    {
        private readonly AppDbContext _db;

        public AdminDashboardService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<DashboardStatsDto> GetDashboardStatsAsync()
        {
            // Total revenue from completed bookings
            var totalRevenue = await _db.Bookings
                .Where(b => b.Status == "Completed")
                .SumAsync(b => (decimal?)b.TotalAmount) ?? 0m;

            // Active technicians (available)
            var activeTechCount = await _db.Technicians
                .Where(t => t.AvailabilityStatus == "Available")
                .CountAsync();

            // Active customers
            var activeCustomerCount = await _db.Users
                .Where(u => u.Role == "Customer" && u.Status == "Active")
                .CountAsync();

            // Jobs in progress
            var jobsInProgress = await _db.Bookings
                .Where(b => b.Status == "InProgress")
                .CountAsync();

            // New registrations (last 7 days)
            var last7 = DateTime.UtcNow.AddDays(-7);
            var newRegistrations = await _db.Users
                .Where(u => u.CreatedAt >= last7)
                .CountAsync();

            // For now keep some dummy % changes – can compute properly later
            return new DashboardStatsDto
            {
                //TotalRevenue = totalRevenue,
                ActiveTechnicians = activeTechCount,
                ActiveCustomers = activeCustomerCount,
                JobsInProgress = jobsInProgress,
                NewRegistrations = newRegistrations,
               //RevenueChange = 0,
                TechnicianChange = 0,
                JobsChange = 0
            };
        }

        public async Task<List<RecentActivityDto>> GetRecentActivityAsync()
        {
            var recentBookings = await _db.Bookings
                .AsNoTracking()
                .OrderByDescending(b => b.CreatedAt)
                .Take(10)
                .ToListAsync();

            var list = new List<RecentActivityDto>();

            foreach (var b in recentBookings)
            {
                var color = b.Status switch
                {
                    "Pending" => "teal",
                    "Accepted" => "blue",
                    "InProgress" => "yellow",
                    "Completed" => "green",
                    "Cancelled" => "red",
                    _ => "purple"
                };

                list.Add(new RecentActivityDto
                {
                    Message = $"Booking #{b.BookingID} - {b.Status}",
                    TimeAgo = ToTimeAgo(b.CreatedAt),
                    Color = color
                });
            }

            return list;
        }

        public async Task<BookingTrendsDto> GetBookingTrendsAsync()
        {
            var today = DateTime.UtcNow.Date;
            var fromDate = today.AddDays(-29); // last 30 days

            var grouped = await _db.Bookings
                .AsNoTracking()
                .Where(b => b.BookingDate.Date >= fromDate && b.BookingDate.Date <= today)
                .GroupBy(b => b.BookingDate.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .ToListAsync();

            var lookup = grouped.ToDictionary(x => x.Date, x => x.Count);

            var labels = new List<string>();
            var data = new List<int>();

            for (var d = fromDate; d <= today; d = d.AddDays(1))
            {
                labels.Add(d.ToString("MM-dd"));
                data.Add(lookup.TryGetValue(d, out var c) ? c : 0);
            }

            var dataset = new ChartDataset
            {
                Label = "Bookings",
                Data = data
            };

            return new BookingTrendsDto
            {
                Labels = labels,
                Datasets = new List<ChartDataset> { dataset },
                Growth = "" // we can compute growth later if you want
            };
        }

        private static string ToTimeAgo(DateTime createdAt)
        {
            var span = DateTime.UtcNow - createdAt;

            if (span.TotalMinutes < 1)
                return "Just now";
            if (span.TotalMinutes < 60)
                return $"{(int)span.TotalMinutes} mins ago";
            if (span.TotalHours < 24)
                return $"{(int)span.TotalHours} hours ago";
            if (span.TotalDays < 7)
                return $"{(int)span.TotalDays} days ago";

            var weeks = (int)(span.TotalDays / 7);
            return $"{weeks} week{(weeks > 1 ? "s" : "")} ago";
        }
    }
}

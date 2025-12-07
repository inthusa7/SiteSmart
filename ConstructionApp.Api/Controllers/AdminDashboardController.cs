// Controllers/AdminDashboardController.cs
using ConstructionApp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ConstructionApp.Api.Controllers
{
    [Route("api/admin/dashboard")]
    [ApiController]
    [Authorize(Roles = "Admin,SuperAdmin")]
    public class AdminDashboardController : ControllerBase
    {
        private readonly AdminDashboardService _service;

        public AdminDashboardController(AdminDashboardService service)
        {
            _service = service;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var stats = await _service.GetDashboardStatsAsync();
            return Ok(stats);
        }

        [HttpGet("recent-activity")]
        public async Task<IActionResult> GetRecentActivity()
        {
            var activities = await _service.GetRecentActivityAsync();
            return Ok(activities);
        }

        [HttpGet("booking-trends")]
        public async Task<IActionResult> GetBookingTrends()
        {
            var trends = await _service.GetBookingTrendsAsync();
            return Ok(trends);
        }
    }
}

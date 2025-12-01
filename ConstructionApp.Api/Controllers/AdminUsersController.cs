
// Controllers/AdminUsersController.cs
using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApp.Api.Data;


namespace ConstructionApp.Api.Controllers
{
    [ApiController]
    [Route("api/admin/users")]
    [Authorize(Roles = "Admin,SuperAdmin")]
   // [AllowAnonymous]  
    public class AdminUsersController : ControllerBase
    {
        private readonly AppDbContext _db;

        public AdminUsersController(AppDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// GET /api/admin/users
        /// Query parameters:
        ///  - role: All | Customer | Technician | Admin  (default = All)
        ///  - page: 1
        ///  - size: 20
        ///  - search: partial name/email/phone
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string role = "All",
            [FromQuery] int page = 1,
            [FromQuery] int size = 20,
            [FromQuery] string? search = null)
        {
            if (page < 1) page = 1;
            if (size < 1 || size > 200) size = 20;

            var q = _db.Users
                .AsNoTracking()
                .Include(u => u.Technician)
                .Include(u => u.Admin)
                .AsQueryable();

            if (!string.Equals(role, "All", StringComparison.OrdinalIgnoreCase))
            {
                q = q.Where(u => u.Role == role);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                q = q.Where(u =>
                    EF.Functions.Like(u.FullName, $"%{s}%") ||
                    EF.Functions.Like(u.Email, $"%{s}%") ||
                    (u.Phone != null && EF.Functions.Like(u.Phone, $"%{s}%"))
                );
            }

            var total = await q.CountAsync();

            var users = await q
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * size)
                .Take(size)
                .Select(u => new
                {
                    u.UserID,
                    u.FullName,
                    u.Email,
                    u.Phone,
                    u.Role,
                    u.Status,
                    CreatedAt = u.CreatedAt,
                    EmailConfirmed = u.EmailConfirmed,
                    Technician = u.Technician == null ? null : new
                    {
                        u.Technician.TechnicianID,
                        u.Technician.VerificationStatus,
                        u.Technician.ProfileImage,
                        u.Technician.ExperienceYears,
                        u.Technician.RatingAverage
                    },
                    Admin = u.Admin == null ? null : new
                    {
                        u.Admin.AdminID,
                        u.Admin.AdminLevel,
                        u.Admin.CanManageUsers,
                        u.Admin.CanManageServices
                    }
                })
                .ToListAsync();

            return Ok(new
            {
                success = true,
                total,
                page,
                size,
                users
            });
        }

        /// <summary>
        /// GET /api/admin/users/{id}
        /// Get user detail including role specific info
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetUser(int id)
        {
            var u = await _db.Users
                .AsNoTracking()
                .Include(x => x.Technician)
                .Include(x => x.Admin)
                .Where(x => x.UserID == id)
                .Select(x => new
                {
                    x.UserID,
                    x.FullName,
                    x.Email,
                    x.Phone,
                    x.Role,
                    x.Status,
                    CreatedAt = x.CreatedAt,
                    EmailConfirmed = x.EmailConfirmed,
                    VerificationToken = x.VerificationToken,
                    Technician = x.Technician == null ? null : new
                    {
                        x.Technician.TechnicianID,
                        x.Technician.ProfileImage,
                        x.Technician.ExperienceYears,
                        x.Technician.RatingAverage,
                        x.Technician.TotalRatings,
                        x.Technician.AvailabilityStatus,
                        x.Technician.VerificationStatus,
                        x.Technician.VerifiedAt,
                        x.Technician.WalletBalance
                    },
                    Admin = x.Admin == null ? null : new
                    {
                        x.Admin.AdminID,
                        x.Admin.AdminLevel,
                        x.Admin.CanManageUsers,
                        x.Admin.CanManageServices,
                        x.Admin.CanViewReports
                    }
                })
                .FirstOrDefaultAsync();

            if (u == null) return NotFound(new { success = false, message = "User not found" });

            return Ok(new { success = true, user = u });
        }

    }
}
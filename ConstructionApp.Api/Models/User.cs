// Models/User.cs → FINAL PERFECT VERSION
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApp.Api.Models
{
    public class User
    {
        [Key]
        public int UserID { get; set; }

        [Required, StringLength(100)]
        public string FullName { get; set; } = string.Empty;

        [Required, StringLength(255), EmailAddress]
        public string Email { get; set; } = string.Empty;

        [StringLength(20), Phone]
        public string? Phone { get; set; }

        [Required]
        public string PasswordHash { get; set; } = string.Empty;

        [StringLength(20)]
        public string Role { get; set; } = "Customer"; // Customer, Technician, Admin

        [StringLength(20)]
        public string Status { get; set; } = "Active";

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Profile Image - இது User table-ல இருக்கும் (Technician-க்கு தனியா இல்லை!)
        [StringLength(1000)]
        public string? ProfileImage { get; set; }

        // Email Verification
        public string? VerificationToken { get; set; }
        public bool EmailConfirmed { get; set; } = false;
        public DateTime? TokenExpires { get; set; }

        // Password Reset
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpires { get; set; }

        // Navigation Properties
        public Technician? Technician { get; set; }
        public Admin? Admin { get; set; }

        public ICollection<Address> Addresses { get; set; } = new List<Address>();
        public ICollection<Booking> CustomerBookings { get; set; } = new List<Booking>();
    }

    public class Technician
    {
        [Key]
        public int TechnicianID { get; set; }

        [ForeignKey("User")]
        public int UserID { get; set; }

        public int ExperienceYears { get; set; } = 0;

        [Column(TypeName = "decimal(3,2)")]
        public decimal RatingAverage { get; set; } = 0.0m;

        public int TotalRatings { get; set; } = 0;

        [StringLength(20)]
        public string AvailabilityStatus { get; set; } = "Available";

        [Column(TypeName = "decimal(18,2)")]
        public decimal WalletBalance { get; set; } = 0.00m;

        public int TotalJobsCompleted { get; set; } = 0;

        [StringLength(20)]
        public string VerificationStatus { get; set; } = "Pending";

        [StringLength(1000)]
        public string? IDProof { get; set; }

        [StringLength(1000)]
        public string? Certificate { get; set; }

        public DateTime? VerifiedAt { get; set; }

        // Navigation
        public User User { get; set; } = null!;

        public ICollection<Booking> AssignedBookings { get; set; } = new List<Booking>();
        public ICollection<TechnicianCategory> TechnicianCategories { get; set; } = new List<TechnicianCategory>();
    }

   
}
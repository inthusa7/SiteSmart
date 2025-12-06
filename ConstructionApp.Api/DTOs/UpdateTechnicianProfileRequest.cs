using System.ComponentModel.DataAnnotations;

namespace ConstructionApp.Api.DTOs
{
    public class UpdateTechnicianProfileRequest
    {
        [Required]
        public string FullName { get; set; } = null!;

        [Required, EmailAddress]
        public string Email { get; set; } = null!;

        [Required]
        public string Phone { get; set; } = null!;

        public CreateAddressRequest Address { get; set; } = new();

        // optional password change
        public string? CurrentPassword { get; set; }
        [MinLength(6)]
        public string? NewPassword { get; set; }
    }
}

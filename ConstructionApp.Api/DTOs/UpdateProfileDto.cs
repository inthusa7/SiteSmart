using System.ComponentModel.DataAnnotations;

namespace ConstructionApp.Api.DTOs
{
    public class UpdateProfileRequest
    {
        [Required]
        public string FullName { get; set; } = null!;

        [Required]
        public string Email { get; set; } = null!;

        [Required]
        public string Phone { get; set; } = null!;

        public CreateAddressRequest Address { get; set; } = new CreateAddressRequest();

        public string? CurrentPassword { get; set; }
        public string? NewPassword { get; set; }
    }
}

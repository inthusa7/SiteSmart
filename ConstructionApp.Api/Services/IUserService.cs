using System.Threading.Tasks;
using ConstructionApp.Api.DTOs;

namespace ConstructionApp.Api.Services
{
    public interface IUserService
    {
        // Update profile returns a tuple (bool success, string message)
        Task<(bool Success, string Message)> UpdateProfileAsync(int userId, UpdateProfileRequest dto);

        // Add other user related method signatures if needed
    }
}

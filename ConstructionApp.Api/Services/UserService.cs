using System;
using System.Threading.Tasks;
using ConstructionApp.Api.Data;
using ConstructionApp.Api.DTOs;
using ConstructionApp.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace ConstructionApp.Api.Services
{
    public class UserService : IUserService
    {
        private readonly AppDbContext _context;

        public UserService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<(bool Success, string Message)> UpdateProfileAsync(int userId, UpdateProfileRequest dto)
        {
            var user = await _context.Users.FirstOrDefaultAsync(x => x.UserID == userId);
            if (user == null)
                return (false, "User not found");

            user.FullName = dto.FullName?.Trim() ?? user.FullName;
            user.Email = dto.Email?.Trim() ?? user.Email;
            user.Phone = dto.Phone?.Trim() ?? user.Phone;

            // Address update/create
            var address = await _context.Addresses.FirstOrDefaultAsync(a => a.UserID == userId);
            if (address == null)
            {
                address = new Address { UserID = userId };
                _context.Addresses.Add(address);
            }

            if (dto.Address != null)
            {
                address.Street = dto.Address.Street?.Trim() ?? address.Street;
                address.City = dto.Address.City?.Trim() ?? address.City;
                address.State = dto.Address.State?.Trim() ?? address.State;
                address.PostalCode = dto.Address.PostalCode?.Trim() ?? address.PostalCode;
                address.Country = string.IsNullOrWhiteSpace(dto.Address.Country) ? (address.Country ?? "Sri Lanka") : dto.Address.Country.Trim();
            }

            // Password change if requested
            if (!string.IsNullOrEmpty(dto.NewPassword))
            {
                if (string.IsNullOrEmpty(dto.CurrentPassword) || !VerifyPassword(user.PasswordHash, dto.CurrentPassword))
                    return (false, "Current password is incorrect.");

                user.PasswordHash = HashPassword(dto.NewPassword);
            }

            await _context.SaveChangesAsync();

            return (true, "Profile updated successfully");
        }

        // -------------------------
        // Password helpers (BCrypt)
        // -------------------------
        private static string HashPassword(string plain)
        {
            // Uses BCrypt.Net-Next package. See NuGet note below.
            return BCrypt.Net.BCrypt.HashPassword(plain);
        }

        private static bool VerifyPassword(string hashed, string plain)
        {
            if (string.IsNullOrEmpty(hashed) || string.IsNullOrEmpty(plain))
                return false;

            try
            {
                return BCrypt.Net.BCrypt.Verify(plain, hashed);
            }
            catch
            {
                // if BCrypt fails for some reason, fall back false
                return false;
            }
        }
    }
}

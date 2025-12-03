using System;

namespace ConstructionApp.Api.Models;


public class Category
{
     public int CategoryID { get; set; }
        public string CategoryName { get; set; } = null!;
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;

        // ⭐ Add these fields (to fix controller errors)
        public string? CreatedBy { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedDate { get; set; }

    public ICollection<Service> Services { get; set; } = new List<Service>();
    public ICollection<TechnicianCategory> TechnicianCategories { get; set; } = new List<TechnicianCategory>();
}

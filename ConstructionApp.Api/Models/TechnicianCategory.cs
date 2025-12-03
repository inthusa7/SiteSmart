// Models/TechnicianCategory.cs
using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApp.Api.Models
{
    public class TechnicianCategory
    {
        [Key]
        public int Id { get; set; }

        // Foreign keys
        public int TechnicianID { get; set; }
        public Technician Technician { get; set; } = null!;

        public int CategoryID { get; set; }
        public Category Category { get; set; } = null!;

        public bool IsActive { get; set; } = true;

        //public int ExperienceYears { get; set; } = 0;

        public DateTime CreatedDate { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedDate { get; set; }
    }
}

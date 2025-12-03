// File: Data/AppDbContext.cs
using Microsoft.EntityFrameworkCore;
using ConstructionApp.Api.Models;

namespace ConstructionApp.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // DbSets
        public DbSet<User> Users { get; set; }
        public DbSet<Admin> Admins { get; set; }           // Admin table
        public DbSet<Technician> Technicians { get; set; } // Technician table
        public DbSet<Service> Services { get; set; }
        public DbSet<Booking> Bookings { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Address> Addresses { get; set; }       // if you have Address model
        public DbSet<TechnicianCategory> TechnicianCategories { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // USER - Base table
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(u => u.UserID);
                entity.HasIndex(u => u.Email).IsUnique();
                entity.Property(u => u.FullName).HasMaxLength(100).IsRequired();
                entity.Property(u => u.Email).HasMaxLength(255).IsRequired();
                entity.Property(u => u.Phone).HasMaxLength(20);
                entity.Property(u => u.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            });

            // ADMIN - 1:1 with User
            modelBuilder.Entity<Admin>(entity =>
            {
                entity.HasKey(a => a.AdminID);
                entity.Property(a => a.ProfileImage).HasMaxLength(500);
                entity.Property(a => a.AdminLevel).HasMaxLength(50).HasDefaultValue("SuperAdmin");
                entity.Property(a => a.LastLoginIP).HasMaxLength(45);

                entity.HasOne(a => a.User)
                      .WithOne(u => u.Admin)
                      .HasForeignKey<Admin>(a => a.UserID)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // TECHNICIAN - 1:1 with User
            modelBuilder.Entity<Technician>(entity =>
            {
                entity.HasKey(t => t.TechnicianID);
               // entity.Property(t => t.ProfileImage).HasMaxLength(500);
                entity.Property(t => t.AvailabilityStatus).HasMaxLength(20).HasDefaultValue("Available");
                entity.Property(t => t.VerificationStatus).HasMaxLength(20).HasDefaultValue("Pending");
                entity.Property(t => t.RatingAverage).HasColumnType("decimal(3,2)");
                entity.Property(t => t.WalletBalance).HasColumnType("decimal(18,2)");

                entity.HasOne(t => t.User)
                      .WithOne(u => u.Technician)
                      .HasForeignKey<Technician>(t => t.UserID)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // SERVICE
            modelBuilder.Entity<Service>(entity =>
            {
                entity.HasKey(s => s.ServiceID);
                entity.Property(s => s.ServiceName).HasMaxLength(100).IsRequired();
                entity.Property(s => s.FixedRate).HasColumnType("decimal(10,2)");
                entity.Property(s => s.EstimatedDuration).HasColumnType("decimal(3,1)");
                entity.HasIndex(s => s.ServiceName);
            });

            // CATEGORY
            modelBuilder.Entity<Category>(entity =>
            {
                entity.HasKey(c => c.CategoryID);
                entity.Property(c => c.CategoryName).HasMaxLength(50).IsRequired();
                entity.HasIndex(c => c.CategoryName).IsUnique();
            });

            // BOOKING - Fully Correct Relationships
            modelBuilder.Entity<Booking>(entity =>
            {
                entity.HasKey(b => b.BookingID);
                entity.Property(b => b.Description).HasMaxLength(1000);
                entity.Property(b => b.ReferenceImage).HasMaxLength(500);
                entity.Property(b => b.Status).HasMaxLength(20).HasDefaultValue("Pending");
                entity.Property(b => b.TotalAmount).HasColumnType("decimal(18,2)").IsRequired();
                entity.Property(b => b.BookingDate).HasDefaultValueSql("GETUTCDATE()");

                // Customer (User)
                entity.HasOne(b => b.User)
                      .WithMany(u => u.CustomerBookings)
                      .HasForeignKey(b => b.UserID)
                      .OnDelete(DeleteBehavior.Restrict);

                // Service
                entity.HasOne(b => b.Service)
                      .WithMany(s => s.Bookings)
                      .HasForeignKey(b => b.ServiceID)
                      .OnDelete(DeleteBehavior.Restrict);

                // Assigned Technician (nullable)
                entity.HasOne(b => b.Technician)
                      .WithMany(t => t.AssignedBookings)
                      .HasForeignKey(b => b.TechnicianID)
                      .OnDelete(DeleteBehavior.SetNull)
                      .IsRequired(false);

                // Address (if exists)
                entity.HasOne(b => b.Address)
                      .WithMany()
                      .HasForeignKey(b => b.AddressID)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // TechnicianCategory
             modelBuilder.Entity<TechnicianCategory>()
                .HasOne(tc => tc.Technician)
                .WithMany(t => t.TechnicianCategories)
                .HasForeignKey(tc => tc.TechnicianID)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<TechnicianCategory>()
                .HasOne(tc => tc.Category)
                .WithMany(c => c.TechnicianCategories)
                .HasForeignKey(tc => tc.CategoryID)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
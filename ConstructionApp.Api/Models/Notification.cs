using System.ComponentModel.DataAnnotations;

namespace ConstructionApp.Api.Models
{
public class Notification
{
    [Key]
    public int NotificationID {get; set;}
    public required string Title {get; set;}
    public required string Message {get; set;}
    public string? Category {get; set;}
    public string? TargetType {get; set;}
    public string? TargetRole { get; set; }

        // when TargetType == "User"
    public int? TargetUserID { get; set; }

    public int? CreatedByAdminID { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<NotificationUser> NotificationUsers { get; set; } = new List<NotificationUser>();
}

    public class NotificationUser
    {
        public int NotificationUserID { get; set; }

        public int NotificationID { get; set; }
        public Notification Notification { get; set; } = null!;

        public int UserID { get; set; }
        public User User { get; set; } = null!; // your existing User entity

        public bool IsRead { get; set; } = false;
        public DateTime? ReadAt { get; set; }
    }
}

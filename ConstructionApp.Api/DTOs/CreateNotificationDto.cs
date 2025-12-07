namespace ConstructionApp.Api.DTOs
{
 public class CreateNotificationDto
    {
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string? Category { get; set; }
       // "All" | "Role" | "User"
        public string TargetType { get; set; } = "All";
        // when TargetType = "Role"
        public string? TargetRole { get; set; }
        // when TargetType = "User"
        public int? TargetUserId { get; set; }
    }
}
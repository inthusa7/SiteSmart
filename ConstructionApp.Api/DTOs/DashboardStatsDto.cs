namespace ConstructionApp.Api.DTOs
{
    public class DashboardStatsDto
    {
       // public decimal TotalRevenue { get; set; }
        public int ActiveTechnicians { get; set; }
        public int ActiveCustomers { get; set; } 
        public int JobsInProgress { get; set; }
        public int NewRegistrations { get; set; }
       // public double RevenueChange { get; set; }
        public double TechnicianChange { get; set; }
        public double JobsChange { get; set; }
    }

    public class RecentActivityDto
    {
        public string Message { get; set; } = "";
        public string TimeAgo { get; set; } = "";
        public string Color { get; set; } = "";
    }

    public class BookingTrendsDto
    {
        public List<string> Labels { get; set; } = new();
        public List<ChartDataset> Datasets { get; set; } = new();
        public string Growth { get; set; } = "";
    }

    public class ChartDataset
    {
        public string Label { get; set; } = "";
        public List<int> Data { get; set; } = new();
    }
}

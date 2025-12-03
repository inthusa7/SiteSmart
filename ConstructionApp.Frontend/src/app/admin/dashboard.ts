import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AdminDashboardService, BookingTrends, DashboardStats, RecentActivity } from '../shared/services/admin-dashboard.service';
import { LucideAngularModule } from "lucide-angular";
import { NgIcon } from "@ng-icons/core";

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, NgIcon],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})

export class AdminDashboardComponent {
  stats: DashboardStats | null = null;
  activities: RecentActivity[] = [];
  trends: BookingTrends | null = null;

  constructor(private dashboardService: AdminDashboardService) { }

  ngOnInit(): void {
    this.loadStats();
    this.loadActivities();
    this.loadTrends();
  }

  loadStats() {
    this.dashboardService.getStats().subscribe(res => this.stats = res);
  }

  loadActivities() {
    this.dashboardService.getRecentActivity().subscribe(res => this.activities = res);
  }

  loadTrends() {
    this.dashboardService.getBookingTrends().subscribe(res => this.trends = res);
  }
}

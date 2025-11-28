// src/app/technician/dashboard.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TechnicianService } from './technician.service';
import { AuthService } from '../shared/services/auth.service';

@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [CommonModule], // <-- fixes *ngIf / *ngFor warnings
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TechnicianDashboardComponent implements OnInit {
  profileName = 'John Doe';
  profileImage = '/assets/avatar.png';

  stats: any = {};
  newJobs: any[] = [];
  currentJob: any | null = null;
  weekly: any = {};

  verificationStatus: string | null = null;
  loading = false;
  error = '';

  constructor(private techService: TechnicianService, private auth: AuthService) {}

  ngOnInit(): void {
    // get verification status from AuthService (if you store it there)
    // fallback to 'Verified' for demo
    try {
      // If your AuthService exposes a method, use it. Otherwise default.
      // this.verificationStatus = this.auth.getTechnicianVerificationStatus();
      this.verificationStatus = 'Verified';
    } catch {
      this.verificationStatus = 'Verified';
    }

    this.setupMockData();
    // optionally call API:
    // this.loadJobs();
  }

  private setupMockData(): void {
    this.stats = {
      totalRevenue: 4250,
      jobsCompleted: 15,
      currentRating: 4.8,
      wallet: 850.75,
      revenueChange: 5.2,
      jobsChange: 2.0
    };

    this.newJobs = [
      { bookingID: 101, title: 'Plumbing Fixture Installation', rateText: 'Fixed Rate: $250', address: '123 Main St, Anytown' },
      { bookingID: 102, title: 'Electrical Wiring Repair', rateText: 'Fixed Rate: $400', address: '456 Oak Ave, Somecity' },
      { bookingID: 103, title: 'Custom Shelving Unit', rateText: 'Fixed Rate: $320', address: '789 Pine Ln, Villagetown' }
    ];

    this.currentJob = { bookingID: 99, title: 'HVAC System Maintenance', address: '987 Birch Rd, Metropolia', progress: 75, status: 'InProgress' };

    this.weekly = { total: 1150, change: 12, bars: [10, 40, 60, 30, 90, 70, 100] };
  }

  // if you want to load real data from API:
  loadJobs(): void {
    this.loading = true;
    this.techService.getAssignedJobs().subscribe({
      next: (res: any) => {
        this.loading = false;
        this.newJobs = res?.data ?? res ?? this.newJobs;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Failed to load jobs';
      }
    });
  }

  isPending(): boolean {
    return this.verificationStatus !== 'Verified';
  }

  acceptJob(bookingId: number): void {
    if (this.isPending()) {
      alert('Admin verification required to accept jobs.');
      return;
    }

    // If using API:
    if (this.techService && typeof this.techService.acceptJob === 'function') {
      this.techService.acceptJob(bookingId).subscribe({
        next: () => this.loadJobs(),
        error: (err: any) => alert(err?.error?.message ?? 'Failed to accept job')
      });
      return;
    }

    // fallback UI-only behaviour
    this.newJobs = this.newJobs.filter(j => j.bookingID !== bookingId);
    alert('Accepted job ' + bookingId);
  }

  decline(bookingId: number): void {
    // call API if available; otherwise just remove locally
    this.newJobs = this.newJobs.filter(j => j.bookingID !== bookingId);
  }

  updateStatus(bookingId: number, status: string): void {
    if (this.isPending()) {
      alert('Admin verification required to update job status.');
      return;
    }
    if (this.techService && typeof this.techService.updateStatus === 'function') {
      this.techService.updateStatus(bookingId, status).subscribe({
        next: () => this.loadJobs(),
        error: (err: any) => alert(err?.error?.message ?? 'Failed to update status')
      });
      return;
    }
    // fallback: update local mock
    if (this.currentJob && this.currentJob.bookingID === bookingId) {
      this.currentJob.status = status;
    }
  }

  onStatusChange(event: Event, bookingId: number): void {
    const el = event.target as HTMLSelectElement | null;
    const value = el ? el.value : '';
    if (value) this.updateStatus(bookingId, value);
  }
}

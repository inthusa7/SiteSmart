// src/app/technician/dashboard.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TechnicianService } from '../shared/services/technician.service';
import { AuthService } from '../shared/services/auth.service';
import { RouterLink } from '@angular/router';
import { TechnicianVerifyDocComponent } from "./verify/technician-verify-doc.component";
import { ContactAboutComponent } from './contact-about/contact-about.component';
import { ProfileComponent } from './profile/profile.component';
import { WalletComponent } from './wallet/wallet.component';
import { JobsComponent } from './jobs/jobs.component';


@Component({
  selector: 'app-technician-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TechnicianVerifyDocComponent,ContactAboutComponent,ProfileComponent,WalletComponent,JobsComponent], // <-- fixes *ngIf / *ngFor warnings
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

  selectedDocument: File | null = null;
  documentUploaded = false;
  showContactModal = false;
  showProfileModal = false;
  showWalletModal = false;
  showJobsModal = false;


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

// 01.12.2025
    this.loadTechnicianDetails();
    this.loadDashboardData();
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
  // 01.12.2025
  loadTechnicianDetails() {
  const tech = this.auth.getTechnician();

  this.profileName = tech.fullName;
  this.profileImage = tech.profileImage || "/assets/avatar.png";
  this.verificationStatus = tech.verificationStatus;
}

uploadDocument(event: any) {
  this.selectedDocument = event.target.files[0] ?? null;
}

submitDocument() {
  const form = new FormData();
  form.append('file', this.selectedDocument!);
  form.append('technicianId', this.auth.getTechnician().technicianID);

  this.techService.uploadDocument(form).subscribe({
    next: () => {
      this.documentUploaded = true;
      alert("Document uploaded. Waiting for admin approval.");
    },
    error: () => alert("Failed to upload document.")
  });
}
loadDashboardData() {
  this.techService.getDashboard().subscribe({
    next: (data: any) => {
      this.stats = data.stats;
      this.newJobs = data.jobs;
      this.currentJob = data.currentJob;
      this.weekly = data.weekly;
    },
    error: () => this.error = 'Failed to load dashboard data'
  });
}
showVerifyModal = false;

openVerifyModal() {
  this.showVerifyModal = true;
  // disable background scroll
  document.body.style.overflow = 'hidden';
}

closeVerifyModal() {
  this.showVerifyModal = false;
  // restore background scroll
  document.body.style.overflow = '';
}

openContactModal() {
  this.showContactModal = true;
  document.body.style.overflow = 'hidden';
}

closeContactModal() {
  this.showContactModal = false;
  document.body.style.overflow = '';
}

openProfileModal() {
  this.showProfileModal = true;
  document.body.style.overflow = 'hidden';
}

closeProfileModal() {
  this.showProfileModal = false;
  document.body.style.overflow = '';
}

openWalletModal() { this.showWalletModal = true; document.body.style.overflow='hidden'; }
closeWalletModal() { this.showWalletModal = false; document.body.style.overflow=''; }


openJobsModal() { this.showJobsModal = true; document.body.style.overflow = 'hidden'; }
closeJobsModal() { this.showJobsModal = false; document.body.style.overflow = ''; }
}


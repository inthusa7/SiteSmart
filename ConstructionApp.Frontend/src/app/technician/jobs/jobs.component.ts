// src/app/technician/jobs/jobs.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

type Job = {
  bookingID: number;
  title: string;
  address: string;
  rate: number;
  description?: string;
  status: 'new' | 'accepted' | 'declined' | 'inprogress' | 'completed';
  customerName?: string;
  createdAt?: string;
};

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent implements OnInit {
  filterForm!: FormGroup;
  searchText = '';
  jobs: Job[] = [];
  filteredJobs: Job[] = [];

  // detail modal
  showDetail = false;
  activeJob: Job | null = null;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      status: ['all']
    });

    this.setupMockData();
    this.applyFilters();

    // react to filter changes
    this.filterForm.get('status')!.valueChanges.subscribe(() => this.applyFilters());
  }

  setupMockData() {
    const today = new Date();
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    this.jobs = [
      { bookingID: 201, title: 'Fix leaking sink', address: '12 Lakeview Rd', rate: 2500, description: 'Kitchen sink leak — replace P-trap & test.', status: 'new', customerName: 'Mr. Silva', createdAt: iso(today) },
      { bookingID: 202, title: 'Replace light fittings', address: '45 Hill St', rate: 1800, description: 'Replace 4 ceiling lights', status: 'new', customerName: 'Mrs. Perera', createdAt: iso(today) },
      { bookingID: 203, title: 'AC service', address: '3 Palm Ave', rate: 6000, description: 'Full AC maintenance', status: 'accepted', customerName: 'K. Fernando', createdAt: iso(new Date(today.getTime() - 86400000)) },
      { bookingID: 204, title: 'Install shelf', address: '78 River Rd', rate: 3200, description: 'Custom wooden shelf', status: 'new', customerName: 'S. Kumar', createdAt: iso(new Date(today.getTime() - 2 * 86400000)) }
    ];
  }

  applyFilters() {
    const status = this.filterForm.get('status')!.value;
    const q = (this.searchText || '').trim().toLowerCase();

    this.filteredJobs = this.jobs.filter(j => {
      if (status !== 'all' && j.status !== status) return false;
      if (!q) return true;
      return (
        (j.title || '').toLowerCase().includes(q) ||
        (j.address || '').toLowerCase().includes(q) ||
        (String(j.bookingID) || '').includes(q) ||
        (j.customerName || '').toLowerCase().includes(q)
      );
    });
  }

  onSearchChange(value: string) {
    this.searchText = value;
    this.applyFilters();
  }

  openDetail(job: Job) {
    this.activeJob = job;
    this.showDetail = true;
    document.body.style.overflow = 'hidden';
  }

  closeDetail() {
    this.showDetail = false;
    this.activeJob = null;
    document.body.style.overflow = '';
  }

  acceptJob(job: Job) {
    if (job.status === 'accepted') return;
    // in real app call service here
    job.status = 'accepted';
    this.applyFilters();
    alert(`Accepted job ${job.bookingID}`);
  }

  declineJob(job: Job) {
    if (job.status === 'declined') return;
    // in real app call service here
    job.status = 'declined';
    this.applyFilters();
  }

  updateJobStatus(job: Job, status: Job['status']) {
    job.status = status;
    this.applyFilters();
    if (this.activeJob && this.activeJob.bookingID === job.bookingID) {
      this.activeJob = { ...job };
    }
  }

  // helper for grouping or labels in template
  isNew(job: Job) { return job.status === 'new'; }
}

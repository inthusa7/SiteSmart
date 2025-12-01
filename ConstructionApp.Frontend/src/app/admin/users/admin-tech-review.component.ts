
// src/app/admin/users/admin-tech-review.component.ts
import { Component } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { HttpClientModule } from '@angular/common/http';
import { AdminTechReviewService, DocItem, TechnicianApplication } from '../../shared/services/admin-tech-review.service';


@Component({
  selector: 'app-admin-tech-review',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './admin-tech-review.component.html',
  styleUrls: ['./admin-tech-review.component.css']
})
export class AdminTechReviewComponent {
  id!: number;
  loading = false;
  appLoading = false;
  application: TechnicianApplication | null = null;
  error = '';
  actionInProgress = false;
  rejectReason = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: AdminTechReviewService
  ) {
    // subscribe to route param
    this.route.paramMap.subscribe(pm => {
      const idStr = pm.get('id');
      if (idStr) {
        const n = Number(idStr);
        if (!Number.isNaN(n)) {
          this.id = n;
          this.loadApplication();
        } else {
          this.error = 'Invalid application id';
        }
      } else {
        this.error = 'No application id in route';
      }
    });
  }

  loadApplication() {
    if (!this.id) return;
    this.appLoading = true;
    this.error = '';
    this.svc.getApplication(this.id)
      .pipe(finalize(() => (this.appLoading = false)))
      .subscribe({
        next: res => {
          if (res && res.success) {
            this.application = res.data || null;
          } else {
            this.error = res.message || 'Failed to load application';
          }
        },
        error: err => {
          console.error('getApplication error', err);
          this.error = err?.error?.message || 'Failed to load application (server error)';
        }
      });
  }

  // Approve
  approve() {
    if (!this.id || this.actionInProgress) return;
    if (!confirm('Are you sure you want to APPROVE this technician?')) return;
    this.actionInProgress = true;
    this.svc.approveApplication(this.id)
      .pipe(finalize(() => (this.actionInProgress = false)))
      .subscribe({
        next: res => {
          if (res.success) {
            alert(res.message || 'Technician approved');
            this.loadApplication();
          } else {
            alert(res.message || 'Approve failed');
          }
        },
        error: err => {
          console.error('approve error', err);
          alert(err?.error?.message || 'Approve failed (server error)');
        }
      });
  }

  // Reject
  reject() {
    if (!this.id || this.actionInProgress) return;
    if (!this.rejectReason || this.rejectReason.trim().length < 5) {
      if (!confirm('Reject without a reason?')) return;
    } else {
      if (!confirm('Are you sure you want to REJECT this technician?')) return;
    }
    this.actionInProgress = true;
    this.svc.rejectApplication(this.id, this.rejectReason?.trim())
      .pipe(finalize(() => (this.actionInProgress = false)))
      .subscribe({
        next: res => {
          if (res.success) {
            alert(res.message || 'Technician rejected');
            this.loadApplication();
          } else {
            alert(res.message || 'Reject failed');
          }
        },
        error: err => {
          console.error('reject error', err);
          alert(err?.error?.message || 'Reject failed (server error)');
        }
      });
  }

  // Download / open doc
  openDoc(d: DocItem) {
    if (!d || !d.url) return;
    window.open(d.url, '_blank');
  }

  backToList() {
    // navigate back to admin users or requests list
    this.router.navigate(['/admin/users']);
  }
}
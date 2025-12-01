
// admin-users.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { formatDate } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { AdminUsersService, UserListItem } from '../../shared/services/admin-users.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  tabs = [
    { key: null, label: 'All' },
    { key: 'Customer', label: 'Customers' },
    { key: 'Technician', label: 'Technicians' },
    { key: 'Admin', label: 'Admins' }
  ];

  activeRole: string | null = null;
  q = '';
  page = 1;
  pageSize = 12;
  total = 0;
  users: UserListItem[] = [];
  loading = false;
  error = '';

  // details drawer
  selectedUser: UserListItem | null = null;
  drawerOpen = false;
  detailLoading = false;

  constructor(private svc: AdminUsersService) {}

  ngOnInit(): void {
    this.load();
  }

  setTab(role: string | null) {
    if (this.activeRole === role) return;
    this.activeRole = role;
    this.page = 1;
    this.load();
  }

  /**
   * Accept both Event and KeyboardEvent to match template bindings.
   * The template uses (keyup.enter) (KeyboardEvent) and a click (Event).
   */
  onSearchKey(e?: Event | KeyboardEvent) {
    // If called from keyboard event, ensure it's Enter (defensive)
    if (e && 'key' in e) {
      const ke = e as KeyboardEvent;
      if (ke.key && ke.key !== 'Enter') return;
    }
    // perform search
    this.page = 1;
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.svc.listUsers({
      q: this.q || undefined,
      role: this.activeRole || undefined,
      page: this.page,
      pageSize: this.pageSize
    }).pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: res => {
          this.users = res.items || [];
          this.total = res.total || 0;
          // safety: normalize keys if they differ
          this.page = res.page || this.page;
          this.pageSize = res.pageSize || this.pageSize;
        },
        error: err => {
          console.error('listUsers error', err);
          this.error = 'Failed to load users. Check server.';
        }
      });
  }

  openDetails(u: UserListItem) {
    this.detailLoading = true;
    this.drawerOpen = true;
    this.selectedUser = null;
    // fetch fresh details
    this.svc.getUser(u.userId)
      .pipe(finalize(() => (this.detailLoading = false)))
      .subscribe({
        next: d => {
          this.selectedUser = d;
        },
        error: err => {
          console.error('getUser', err);
          this.selectedUser = u; // fallback to basic row data
        }
      });
  }

  closeDrawer() {
    this.drawerOpen = false;
    this.selectedUser = null;
  }

  // paging helpers
  prevPage() {
    if (this.page <= 1) return;
    this.page--;
    this.load();
  }
  nextPage() {
    if (this.page * this.pageSize >= this.total) return;
    this.page++;
    this.load();
  }

  // format ISO date to readable
  fmt(date?: string|null) {
    if (!date) return '-';
    try { return formatDate(date, 'MMM dd, yyyy', 'en-US'); }
    catch { return date; }
  }
}
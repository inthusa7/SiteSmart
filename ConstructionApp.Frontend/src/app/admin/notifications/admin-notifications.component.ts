// src/app/admin/notifications/admin-notifications.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminNotificationItem, AdminNotificationsService, CreateNotificationPayload } from '../../shared/services/admin-notifications.service';


@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-notifications.component.html',
  styleUrls: ['./admin-notifications.component.css']
})
export class AdminNotificationsComponent {
  // form fields
  title = '';
  message = '';
  category: string | null = null;
  targetType = 'All';        // "All" | "Role" | "User"
  targetRole: string | null = null;
  targetUserId: number | null = null;

  // UI state
  submitting = false;
  statusMsg = '';
  loadingList = false;
  listError = '';
  notifications: AdminNotificationItem[] = [];

  // tabs
  activeTab: 'All' | 'Booking' | 'UserActivity' = 'All';

  // pagination
  page = 1;
  size = 10;
  total = 0;
  get totalPages(): number {
    return this.total === 0 ? 1 : Math.ceil(this.total / this.size);
  }

  constructor(private notifSvc: AdminNotificationsService) {
    this.loadNotifications();
  }

  // map tab → category
  private currentCategory(): string | null {
    if (this.activeTab === 'Booking') return 'Booking';
    if (this.activeTab === 'UserActivity') return 'User Activity';
    return null;
  }

  // ====== LOAD LIST ======
  loadNotifications() {
    this.loadingList = true;
    this.listError = '';
    const cat = this.currentCategory();

    this.notifSvc.listNotifications(cat, this.page, this.size)
      .subscribe({
        next: res => {
          this.loadingList = false;
          if (res && res.success) {
            this.notifications = res.items || [];
            this.total = res.total ?? this.notifications.length;
          } else {
            this.listError = res.message || 'Failed to load notifications';
            this.notifications = [];
          }
        },
        error: err => {
          this.loadingList = false;
          this.listError = err?.error?.message || 'Failed to load notifications (server error).';
          this.notifications = [];
        }
      });
  }

  changeTab(tab: 'All' | 'Booking' | 'UserActivity') {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.page = 1;
    this.loadNotifications();
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadNotifications();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.loadNotifications();
    }
  }

  // ====== SEND NOTIFICATION ======
  sendNotification() {
    if (!this.title.trim() || !this.message.trim()) {
      this.statusMsg = 'Title and message are required.';
      return;
    }

    const payload: CreateNotificationPayload = {
      title: this.title.trim(),
      message: this.message.trim(),
      category: this.category || null,
      targetType: this.targetType,
      targetRole: this.targetType === 'Role' ? this.targetRole : null,
      targetUserId: this.targetType === 'User' ? this.targetUserId ?? null : null
    };

    this.submitting = true;
    this.statusMsg = '';

    this.notifSvc.createNotification(payload)
      .subscribe({
        next: res => {
          this.submitting = false;
          if (res && res.success) {
            this.statusMsg = res.message || 'Notification sent successfully.';
            this.clearForm(false);
            this.loadNotifications();
          } else {
            this.statusMsg = res.message || 'Failed to send notification.';
          }
        },
        error: err => {
          this.submitting = false;
          this.statusMsg = err?.error?.message || 'Failed to send notification (server error).';
        }
      });
  }

  clearForm(resetStatus = true) {
    this.title = '';
    this.message = '';
    this.category = null;
    this.targetType = 'All';
    this.targetRole = null;
    this.targetUserId = null;

    if (resetStatus) {
      this.statusMsg = '';
    }
  }
}

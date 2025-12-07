import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserNotificationsService, UserNotificationItem } from '../../shared/services/user-notifications.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-customer-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customer-notifications.component.html',
  styleUrls: ['./customer-notifications.component.css']
})
export class CustomerNotificationsComponent implements OnInit {
  loading = false;
  error = '';
  items: UserNotificationItem[] = [];
  showUnreadOnly = false;

  // simple badge count
  get unreadCount(): number {
    return this.items.filter(x => !x.isRead).length;
  }

  constructor(
    private notifSvc: UserNotificationsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.loading = true;
    this.error = '';
    this.notifSvc.getMyNotifications(this.showUnreadOnly)
      .subscribe({
        next: res => {
          this.loading = false;
          if (res && res.success) {
            this.items = res.items || [];
          } else {
            this.items = [];
            this.error = res.message || 'Failed to load notifications.';

          }
        },
        error: err => {
          this.loading = false;
          this.items = [];
          this.error = err?.error?.message || 'Failed to load notifications (server error).';
        }
      });
  }

  toggleUnreadOnly() {
    this.showUnreadOnly = !this.showUnreadOnly;
    this.load();
  }

  markRead(item: UserNotificationItem) {
    if (item.isRead) return;

    this.notifSvc.markAsRead(item.notificationUserId)
      .subscribe({
        next: res => {
          if (res && res.success) {
            item.isRead = true;
            item.readAt = new Date().toISOString();
          }
        },
        error: () => {
          // silent; optionally show toast
        }
      });
  }

  formatTargetCategory(cat?: string | null): string {
    if (!cat) return 'General';
    return cat;
  }

   goToDashboard() {
    this.router.navigate(['/customer/dashboard']);
  }

}

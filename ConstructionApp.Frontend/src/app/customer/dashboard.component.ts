// src/app/customer/dashboard/customer-dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { AuthService } from '../shared/services/auth.service';
import { environment } from '../../environments/environment';

interface Booking {
  bookingID: number;
  serviceName: string;
  scheduledDate: string;
  technicianName: string;
  technicianPhoto?: string;
  price: number;
  status: 'Requested' | 'Accepted' | 'In-Progress' | 'Completed' | 'Cancelled';
  progress: number;
}

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class CustomerDashboardComponent implements OnInit, OnDestroy {

  // User Info
  userName: string = 'Loading...';
  userEmail: string = '';
  userAvatar: string = 'https://ui-avatars.com/api/?name=Loading&background=8b5cf6&color=fff&bold=true&size=256';

  // Bookings
  currentBooking: Booking | null = null;
  bookingHistory: Booking[] = [];
  loading = true;

  private apiUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private pollSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
    this.loadBookings();

    // Auto refresh every 10 seconds
    this.pollSubscription = interval(10000).subscribe(() => {
      this.loadBookings();
    });
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  private getHeaders() {
    const token = this.auth.getToken();
    return token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : new HttpHeaders();
  }

  // Load Real User Name + Avatar
  private loadUserProfile(): void {
    const token = this.auth.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    // Decode JWT instantly
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const name = payload.name || payload.fullName || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || 'User';
      const email = payload.email || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || '';

      this.userName = name;
      this.userEmail = email;
      this.userAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff&bold=true&size=256&font-size=0.4`;
    } catch (e) {
      this.userName = 'User';
    }

    // Get latest from API
    this.http.get<any>(`${this.apiUrl}/customer/profile`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          if (res?.success && res?.data) {
            this.userName = res.data.fullName || res.data.name || this.userName;
            this.userEmail = res.data.email || this.userEmail;
            this.userAvatar = res.data.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=8b5cf6&color=fff&bold=true&size=256`;

            localStorage.setItem('userName', this.userName);
            localStorage.setItem('userEmail', this.userEmail);
          }
        },
        error: () => {
          // Fallback to JWT data
          console.warn('Profile API failed, using token data');
        }
      });
  }

  // MAIN FIX: This will work with ANY backend response!
  private loadBookings(): void {
    this.loading = true;

    this.http.get<any>(`${this.apiUrl}/customer/my-bookings`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => {
          console.log('My-Bookings API Response:', res); // Check console!

          let current = null;
          let history: any[] = [];

          if (res?.success && res?.data) {
            const data = res.data;

            // Current Booking
            if (data.currentBooking || data.activeBooking) {
              const cb = data.currentBooking || data.activeBooking;
              current = this.mapBooking(cb);
            }

            // History
            history = (data.bookingHistory || data.history || data.bookings || []).map((b: any) => this.mapBooking(b));
          }
          else if (Array.isArray(res)) {
            history = res.map(b => this.mapBooking(b));
          }

          this.currentBooking = current;
          this.bookingHistory = history.sort((a, b) =>
            new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
          );

          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load bookings:', err);
          this.loading = false;
        }
      });
  }

  private mapBooking(b: any): Booking {
    return {
      bookingID: Number(b.bookingID || b.id || 0),
      serviceName: b.serviceName || b.service?.name || b.title || 'Unknown Service',
      scheduledDate: this.formatDate(b.scheduledDate || b.date || b.bookingDate),
      technicianName: b.technicianName || b.technician?.name || 'Not Assigned',
      technicianPhoto: b.technicianPhoto || b.technician?.photo || null,
      price: Number(b.price || b.totalAmount || b.amount || 0),
      status: this.normalizeStatus(b.status || b.bookingStatus || 'Requested'),
      progress: this.getProgressFromStatus(b.status || b.bookingStatus)
    };
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private normalizeStatus(status: string): Booking['status'] {
    const s = status?.toLowerCase();
    if (s?.includes('request')) return 'Requested';
    if (s?.includes('accept') || s?.includes('confirm')) return 'Accepted';
    if (s?.includes('progress') || s?.includes('ongoing')) return 'In-Progress';
    if (s?.includes('complete')) return 'Completed';
    if (s?.includes('cancel')) return 'Cancelled';
    return 'Requested';
  }

  private getProgressFromStatus(status: string): number {
    switch (this.normalizeStatus(status)) {
      case 'Requested': return 20;
      case 'Accepted': return 50;
      case 'In-Progress': return 75;
      case 'Completed': return 100;
      case 'Cancelled': return 0;
      default: return 10;
    }
  }

  getStatusClass(status: string): any {
    const s = this.normalizeStatus(status);
    return {
      'status-requested': s === 'Requested',
      'status-accepted': s === 'Accepted',
      'status-inprogress': s === 'In-Progress',
      'status-completed': s === 'Completed',
      'status-cancelled': s === 'Cancelled'
    };
  }

  viewDetails(id: number): void {
    if (id > 0) this.router.navigate(['/customer/booking-details', id]);
  }

  contactTechnician(): void {
    if (this.currentBooking?.bookingID) {
      this.router.navigate(['/customer/chat', this.currentBooking.bookingID]);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/home']);
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../shared/services/auth.service';

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

  userName: string = 'User';
  userEmail: string = '';
  userPhone: string = '';
  userAvatar: string = '';

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
    this.loadDashboardData();

    // Auto-refresh every 10 seconds
    this.pollSubscription = interval(10000).subscribe(() => {
      this.loadDashboardData();
    });
  }

  ngOnDestroy(): void {
    this.pollSubscription?.unsubscribe();
  }

  private getAuthHeaders() {
    const token = this.auth.getToken();
    return token
      ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) }
      : {};
  }

  private loadUserProfile(): void {
    const token = this.auth.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.userName = payload.name || payload.fullName || 'User';
      this.userEmail = payload.email || '';
    } catch {}

    this.http.get<any>(`${this.apiUrl}/customer/profile`, this.getAuthHeaders())
      .subscribe({
        next: (res) => {
          if (res?.success && res?.data) {
            this.userName = res.data.fullName || this.userName;
            this.userEmail = res.data.email || this.userEmail;
            this.userPhone = res.data.phone || '';
            this.userAvatar = res.data.profileImage || this.getDefaultAvatar();
            localStorage.setItem('userName', this.userName);
          }
        },
        error: () => {
          this.userAvatar = this.getDefaultAvatar();
        }
      });
  }

 private loadDashboardData(): void {
  this.loading = true;

  this.http.get<any>(`${this.apiUrl}/customer/my-bookings`, this.getAuthHeaders())
    .subscribe({
      next: (res) => {
        console.log('My Bookings Response:', res);

        if (res?.success && res?.data) {
          const data = res.data;

          /* -------------------- CURRENT BOOKING -------------------- */
          const cb = data.currentBooking;
          if (cb) {
            this.currentBooking = {
              bookingID: cb.bookingID,
              serviceName: cb.serviceName || cb.service?.serviceName || '',
              scheduledDate: cb.date || cb.scheduledDate || '',
              technicianName: cb.technicianName || cb.technician?.name || '',
              technicianPhoto: cb.technicianPhoto || cb.technician?.photoUrl || '',
              price: cb.price || cb.totalAmount || 0,
              status: cb.status || cb.bookingStatus || '',
              progress: this.getProgressFromStatus(cb.status || cb.bookingStatus)
            };
          } else {
            this.currentBooking = null;
          }

          /* -------------------- BOOKING HISTORY -------------------- */
          const history = data.bookingHistory || data.history || [];

          this.bookingHistory = history.map((b: any) => ({
            bookingID: b.bookingID,
            serviceName: b.serviceName || b.service?.serviceName || '',
            scheduledDate: b.date || b.scheduledDate || '',
            technicianName: b.technicianName || b.technician?.name || '',
            price: b.price || b.totalAmount || 0,
            status: b.status || b.bookingStatus || '',
            progress: this.getProgressFromStatus(b.status || b.bookingStatus)
          }));

          /* -------------------- SORT NEWEST FIRST -------------------- */
          this.bookingHistory.sort((a, b) =>
            new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
          );
        }

        this.loading = false;
      },

      error: (err) => {
        console.error('My-Bookings API Failed:', err);
        this.loading = false;
      }
    });
}


  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private getProgressFromStatus(status: string): number {
    switch (status) {
      case 'Requested': return 20;
      case 'Accepted': 
      case 'Confirmed': return 50;
      case 'In-Progress': return 75;
      case 'Completed': return 100;
      case 'Cancelled': return 0;
      default: return 10;
    }
  }

  private getDefaultAvatar(): string {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.userName)}&background=8b5cf6&color=fff&bold=true&size=256`;
  }

  getStatusClass(status: string): any {
    return {
      'status-requested': status === 'Requested',
      'status-accepted': status === 'Accepted',
      'status-inprogress': status === 'In-Progress',
      'status-completed': status === 'Completed',
      'status-cancelled': status === 'Cancelled'
    };
  }

  viewDetails(id: number): void {
    if (id) this.router.navigate(['/customer/booking-details', id]);
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

// src/app/customer/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../shared/services/auth.service';  // <-- இது ரொம்ப முக்கியம்!
import { environment } from '../../environments/environment';

interface Booking {
  bookingID: number;
  serviceName: string;
  scheduledDate: string;
  technicianName: string;
  technicianPhoto?: string;
  price: number;
  status: 'Requested' | 'Accepted' | 'In-Progress' | 'Completed';
  progress: number;
  isCurrent?: boolean;
}

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class CustomerDashboardComponent implements OnInit {

  userName: string = 'Loading...';
  userEmail: string = '';
  userPhone: string = '';
  userAvatar: string = 'assets/images/default-avatar.png';

  currentBooking: Booking | null = null;
  bookingHistory: Booking[] = [];
  loading = true;

  private apiUrl = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService   // <-- AuthService inject பண்ணு!
  ) {}

  ngOnInit(): void {
    this.loadUserInfo();      // First user details load
    this.loadDashboard();     // Then bookings
  }

  // REAL USER DETAILS FROM TOKEN + API
  loadUserInfo() {
    const token = this.auth.getToken();

    if (!token) {
      alert('Session expired! Please login again.');
      this.router.navigate(['/login']);
      return;
    }

    // Decode JWT token to get name/email (fast method)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      this.userName = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || payload.name || '';
      this.userEmail = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] || payload.email || '';
    } catch (e) {
      this.userName = '';
    }

    // Optional: API-ல இருந்து fresh data எடுக்கலாம்
    this.http.get<any>(`${this.apiUrl}/customer/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.userName = res.data.fullName || this.userName;
          this.userEmail = res.data.email || this.userEmail;
          this.userPhone = res.data.phone || '';
          this.userAvatar = res.data.profileImage || this.userAvatar;

          // Save to localStorage (for offline fallback)
          localStorage.setItem('userName', this.userName);
          localStorage.setItem('userEmail', this.userEmail);
        }
      },
      error: () => {
        // If API fail ஆனாலும் token-ல இருந்து name காட்டும்
        console.warn('Profile API failed, using token data');
      }
    });
  }

  loadDashboard(): void {
    const token = this.auth.getToken();
    if (!token) return;

    this.loading = true;

    this.http.get<any>(`${this.apiUrl}/customer/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (res) => {
        this.currentBooking = res.currentBooking || null;
        this.bookingHistory = res.history || [];
        this.loading = false;
      },
      error: (err) => {  
        console.warn('Dashboard failed, showing mock data...', err);
   //   this.loadMockData(); // Development-க்கு மட்டும்
        this.loading = false;
      }
    });
  }


  getStatusClass(status: string): any {
    return {
      'status-requested': status === 'Requested',
      'status-accepted': status === 'Accepted',
      'status-inprogress': status === 'In-Progress',
      'status-completed': status === 'Completed'
    };
  }

  viewDetails(id: number): void {
    this.router.navigate(['/customer/booking-details', id]);
  }

  contactTechnician(): void {
    if (this.currentBooking) {
      this.router.navigate(['/customer/chat', this.currentBooking.bookingID]);
    }
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
    alert('Logged out successfully!');
    this.router.navigate(['/home']);
  }
}
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStats {
  totalRevenue: number;
  activeTechnicians: number;
  activeCustomers: number;
  jobsInProgress: number;
  newRegistrations: number;
  revenueChange: number;
  technicianChange: number;
  jobsChange: number;
}

export interface RecentActivity {
  message: string;
  timeAgo: string;
  color: string; // 'teal' | 'green' | 'yellow' | etc.
}

export interface BookingTrends {
  labels: string[];
  datasets: any[];
  growth: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  // same pattern as other services
  private apiRoot = (window as any).__env?.API_BASE_URL || 'http://localhost:5035/api';

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken') || '';
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiRoot}/admin/dashboard/stats`, {
      headers: this.authHeaders()
    });
  }

  getRecentActivity(): Observable<RecentActivity[]> {
    return this.http.get<RecentActivity[]>(`${this.apiRoot}/admin/dashboard/recent-activity`, {
      headers: this.authHeaders()
    });
  }

  getBookingTrends(): Observable<BookingTrends> {
    return this.http.get<BookingTrends>(`${this.apiRoot}/admin/dashboard/booking-trends`, {
      headers: this.authHeaders()
    });
  }
}

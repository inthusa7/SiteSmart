// src/app/technician/technician.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../shared/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TechnicianService {
  private base = 'http://localhost:5035/api/technician/jobs';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private getAuthOptions(): { headers: HttpHeaders } {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
    return { headers };
  }

  getAssignedJobs(): Observable<any> {
    return this.http.get<any>(`${this.base}/assigned`, this.getAuthOptions());
  }

  acceptJob(bookingId: number): Observable<any> {
    return this.http.post<any>(`${this.base}/${bookingId}/accept`, {}, this.getAuthOptions());
  }

  updateStatus(bookingId: number, status: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${bookingId}/status`, { status }, this.getAuthOptions());
  }
}

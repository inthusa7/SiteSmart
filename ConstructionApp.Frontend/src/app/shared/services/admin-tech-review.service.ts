
// src/app/admin/users/admin-tech-review.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DocItem {
  id?: number;
  fileName: string;
  url: string;
  type?: string;
}

export interface TechnicianApplication {
  userId: number;
  fullName: string;
  email: string;
  phone?: string | null;
  role?: string;
  status?: string;
  createdAt?: string;
  emailConfirmed?: boolean;
  profileImage?: string | null;
  bio?: string | null;
  documents?: DocItem[];
  technician?: any | null; // optional extra fields
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable({ providedIn: 'root' })
export class AdminTechReviewService {
  // change if your runtime env provides API_BASE
  private apiRoot = (window as any).__env?.API_BASE_URL || 'http://localhost:5035/api';

  constructor(private http: HttpClient) {}

  // GET application details (admin view)
  // Expected backend route (example): GET /api/admin/technician-requests/{id}
  getApplication(id: number): Observable<ApiResponse<TechnicianApplication>> {
    return this.http.get<ApiResponse<TechnicianApplication>>(`${this.apiRoot}/admin/technician-requests/${id}`, {
      headers: this.authHeaders()
    });
  }

  // Approve application
  // POST /api/admin/technician-requests/{id}/approve
  approveApplication(id: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiRoot}/admin/technician-requests/${id}/approve`, {}, {
      headers: this.authHeaders()
    });
  }

  // Reject application with reason
  // POST /api/admin/technician-requests/{id}/reject
  rejectApplication(id: number, reason?: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiRoot}/admin/technician-requests/${id}/reject`, { reason }, {
      headers: this.authHeaders()
    });
  }

  // small helper to add auth header (adjust token key as you store it)
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token') || '';
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }
}
// src/app/shared/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  role?: string;
  data?: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5035/api';
  private tokenKey = 'token';
  private roleKey = 'role';
  private techKey = 'technicianId';
  private techStatusKey = 'technicianVerificationStatus';

  userRole$ = new BehaviorSubject<string | null>(localStorage.getItem(this.roleKey));
  technicianId$ = new BehaviorSubject<string | null>(localStorage.getItem(this.techKey));

  constructor(private http: HttpClient, private router: Router) {}

  // Generic register (customer/admin)
  register(payload: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    role?: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/register`, payload);
  }

  // Generic login
  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/login`, credentials).pipe(
      tap(res => {
        if (res.success && res.token) {
          localStorage.setItem(this.tokenKey, res.token);
          localStorage.setItem(this.roleKey, res.role || 'Customer');
          this.userRole$.next(res.role || 'Customer');
        }
      })
    );
  }

  // ================= Technician-specific =================

  registerTechnician(payload: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/technician/auth/register`, payload);
  }

  loginTechnician(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/technician/auth/login`, credentials).pipe(
      tap(res => {
        if (res && res.success && res.data) {
          // Backend returns token inside data per previous design
          const token = res.data.token ?? res.token;
          const role = res.data.role ?? res.role ?? 'Technician';
          const technicianId = res.data.technicianId ?? res.data.techId ?? null;
          const verificationStatus = res.data.verificationStatus ?? null;

          if (token) {
            localStorage.setItem(this.tokenKey, token);
            localStorage.setItem(this.roleKey, role);
            this.userRole$.next(role);
          }

          if (technicianId) {
            localStorage.setItem(this.techKey, String(technicianId));
            this.technicianId$.next(String(technicianId));
          }

          if (verificationStatus) {
            localStorage.setItem(this.techStatusKey, verificationStatus);
          }
        }
      })
    );
  }

  // helpers
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  getTechnicianId(): string | null {
    return localStorage.getItem(this.techKey);
  }

   getTechnician() {
  return JSON.parse(localStorage.getItem('technician') || '{}');
  }


  getTechnicianVerificationStatus(): string | null {
    return localStorage.getItem(this.techStatusKey);
  }

  setTechnicianVerificationStatus(value: string) {
    localStorage.setItem(this.techStatusKey, value);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.techKey);
    localStorage.removeItem(this.techStatusKey);
    this.userRole$.next(null);
    this.technicianId$.next(null);
    this.router.navigate(['/login']);
  }
  setUser(user: any) {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser(): any | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }
}
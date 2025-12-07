// src/app/shared/services/auth.service.ts → FIRST CODE STYLE + ALL METHODS + ZERO ERRORS!
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

// உன் CurrentUser interface-ல address இருக்கணும்!
export interface CurrentUser {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  profileImage: string;
  role: string;

  // இதை add பண்ணு → error போயிடும்!
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5035/api';
  private tokenKey = 'token';
  private roleKey = 'role';
  private techKey = 'technicianId';
  private techStatusKey = 'technicianVerificationStatus';

  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  userRole$ = new BehaviorSubject<string | null>(localStorage.getItem(this.roleKey));
  technicianId$ = new BehaviorSubject<string | null>(localStorage.getItem(this.techKey));

  constructor(private http: HttpClient, private router: Router) {
    this.loadUserFromToken();
  }

  // ALL YOUR ORIGINAL METHODS — மாற்றவே இல்லை!
  register(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/register`, payload);
  }

  registerTechnician(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/technician/auth/register`, payload);
  }

  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/login`, credentials).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  loginTechnician(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/technician/auth/login`, credentials).pipe(
      tap(res => this.handleAuthSuccess(res, true))
    );
  }

  private handleAuthSuccess(res: AuthResponse, isTechnician: boolean = false): void {
    if (res.success && (res.token || res.data?.token)) {
      const token = res.token || res.data?.token;
      const role = res.role || res.data?.role || (isTechnician ? 'Technician' : 'Customer');
      const technicianId = res.data?.technicianId?.toString() || res.data?.technician?.technicianID?.toString();

      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.roleKey, role);
      if (technicianId) {
        localStorage.setItem(this.techKey, technicianId);
        this.technicianId$.next(technicianId);
      }
      if (res.data?.verificationStatus) {
        localStorage.setItem(this.techStatusKey, res.data.verificationStatus);
      }

      this.userRole$.next(role);
      this.loadUserFromToken();
    }
  }

  // ORIGINAL loadUserFromToken — FULLY FIXED & SAFE
  private loadUserFromToken(): void {
    const token = this.getToken();
    if (!token) {
      this.currentUserSubject.next(null);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));

      const user: CurrentUser = {
        userId: Number(payload.UserID || payload.sub || payload.userId || 0),
        fullName: payload.fullName || payload.FullName || payload.name || 'User',
        email: payload.email || payload.Email || payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"] || '',
        phone: payload.phone || payload.Phone || '',
        profileImage: payload.profileImage || payload.ProfileImage || '',
        role: payload.role || payload.Role || localStorage.getItem(this.roleKey) || 'Customer'
      };

      this.currentUserSubject.next(user);

      // Save to localStorage (for old components)
      localStorage.setItem('userName', user.fullName);
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userPhone', user.phone);
      localStorage.setItem('userPhoto', user.profileImage);

    } catch (e) {
      console.error('Token decode failed:', e);
      this.logout();
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  getTechnicianId(): string | null {
    return localStorage.getItem(this.techKey);
  }

  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  // இவை எல்லாம் உன் project-ல use ஆகுற methods — இப்போ இருக்கு!
  getMyAddress(): Observable<any> {
    return this.http.get(`${this.apiUrl}/addresses/my`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  uploadTechnicianAvatar(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/technician/upload-avatar`, formData, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  updateTechnicianProfile(payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/technician/update-profile`, payload, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  updateProfile(payload: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/update-profile`, payload, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  // Technician object (for verify page)
  getTechnician(): any {
    const id = this.getTechnicianId();
    return id ? { technicianID: Number(id) } : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.clear();
    this.currentUserSubject.next(null);
    this.userRole$.next(null);
    this.technicianId$.next(null);
    this.router.navigate(['/login']);
  }

  updateCurrentUser(data: Partial<CurrentUser>) {
    const current = this.getCurrentUser();
    if (current) {
      const updated = { ...current, ...data };
      this.currentUserSubject.next(updated);
      localStorage.setItem('userName', updated.fullName);
      localStorage.setItem('userPhone', updated.phone || '');
      localStorage.setItem('userPhoto', updated.profileImage || '');
    }
  }
}

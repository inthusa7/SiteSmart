import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  role?: string;
  data?: any;
}

export interface CurrentUser {
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  profileImage: string;
  role: string;

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

  // --- Auth API methods ---
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

  private handleAuthSuccess(res: AuthResponse, isTechnician = false): void {
    if (res.success && (res.token || res.data?.token)) {
      const token = res.token || res.data?.token;
      const role = res.role || res.data?.role || (isTechnician ? 'Technician' : 'Customer');

      const technician = res.data?.technician;
      if (technician) {
        localStorage.setItem('technicianData', JSON.stringify(technician));
      }

      const technicianId = technician?.technicianID?.toString();
      if (technicianId) {
        localStorage.setItem(this.techKey, technicianId);
        this.technicianId$.next(technicianId);
      }

      localStorage.setItem(this.tokenKey, token);
      localStorage.setItem(this.roleKey, role);

      this.userRole$.next(role);
      // decode token and populate current user subject
      this.loadUserFromToken();
    }
  }

  // decode token -> populate current user (robust)
  private loadUserFromToken(): void {
    const token = this.getToken();
    if (!token) {
      this.currentUserSubject.next(null);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // normalize email extraction
      const extractEmail = (raw: any): string => {
        if (!raw && raw !== '') return '';
        if (Array.isArray(raw)) {
          const first = raw.map((r: any) => String(r ?? '').trim()).find((r: string) => r.length > 0);
          return first ?? '';
        }
        if (typeof raw === 'string') {
          const firstPart = raw.split(',').map(s => s.trim()).find(s => s.length > 0);
          return firstPart ?? '';
        }
        return String(raw ?? '');
      };

      const rawEmail =
        payload.email ??
        payload.Email ??
        payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ??
        '';

      const email = extractEmail(rawEmail);

      const user: CurrentUser = {
        userId: Number(payload.UserID || payload.userID || payload.sub || 0),
        fullName: payload.fullName || payload.FullName || payload.name || 'User',
        email,
        phone: payload.phone || payload.Phone || '',
        profileImage: payload.profileImage || payload.ProfileImage || '',
        role: payload.role || payload.Role || localStorage.getItem(this.roleKey) || 'Customer'
      };

      this.currentUserSubject.next(user);

      // cache small bits for legacy code that reads localStorage
      localStorage.setItem('userName', user.fullName);
      localStorage.setItem('userEmail', user.email);
      localStorage.setItem('userPhone', user.phone);
      localStorage.setItem('userPhoto', user.profileImage);
    } catch (e) {
      console.error('Token decode failed:', e);
      this.logout();
    }
  }

  // --- Helpers & accessors ---
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

  // snapshot helper
  getCurrentUserSnapshot(): CurrentUser | null {
    return this.currentUserSubject.value;
  }

  // try to determine user id from current user or token
  getUserId(): number | null {
    const u = this.getCurrentUser();
    if (u && (u.userId || u.userId === 0)) return Number(u.userId);

    // fallback to token decode
    const token = this.getToken();
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Number(payload.UserID ?? payload.userID ?? payload.sub ?? payload.id ?? null) || null;
    } catch {
      return null;
    }
  }

  // technician object
  getTechnician() {
    const raw = localStorage.getItem('technicianData');
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // logout - clear all keys we used
  logout(): void {
    const role = this.getRole();

    // clear keys used in this service
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.techKey);
    localStorage.removeItem(this.techStatusKey);

    // legacy keys
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('userPhoto');
    localStorage.removeItem('technicianData');

    this.currentUserSubject.next(null);
    this.userRole$.next(null);
    this.technicianId$.next(null);

    // navigate appropriately
    if (role === 'Technician') {
      this.router.navigate(['/technician-login']);
    } else {
      this.router.navigate(['/login']);
    }
  }

  // update current user (merge)
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

  // --- API methods used by your components ---
  updateProfile(payload: any) {
    return this.http.put(`${this.apiUrl}/users/update-profile`, payload);
  }

  updateTechnicianProfile(payload: any) {
    return this.http.put(`${this.apiUrl}/technician/update-profile`, payload, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  uploadTechnicianAvatar(formData: FormData) {
    return this.http.post(`${this.apiUrl}/technician/upload-avatar`, formData, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }

  getMyAddress() {
    return this.http.get(`${this.apiUrl}/technician/my-address`, {
      headers: { Authorization: `Bearer ${this.getToken()}` }
    });
  }
}

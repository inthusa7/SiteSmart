import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  role?: string;
  user?: {
    name?: string;
    email?: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5035/api';
  private tokenKey = 'token';
  private roleKey = 'role';
  private userNameKey = 'userName';

  // Observable for navbar/guards
  userRole$ = new BehaviorSubject<string | null>(localStorage.getItem(this.roleKey));

  constructor(private http: HttpClient, private router: Router) {}

  // ---------------------------------------------------------
  // CUSTOMER REGISTER
  // ---------------------------------------------------------
  register(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/register`, payload);
  }

  // ---------------------------------------------------------
  // CUSTOMER LOGIN
  // ---------------------------------------------------------
  login(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/login`, credentials).pipe(
      tap((res: AuthResponse) => {
        if (res.success && res.token) {
          this.saveAuthData(res.token, res.role || 'Customer', res.user?.name);

          const role = res.role || 'Customer';
          if (role === 'Admin') {
            this.router.navigate(['/admin/dashboard']);
          } else if (role === 'Technician') {
            this.router.navigate(['/technician/dashboard']);
          } else {
            this.router.navigate(['/customer/dashboard']);
          }
        }
      })
    );
  }

  // ---------------------------------------------------------
  // TECHNICIAN REGISTER
  // ---------------------------------------------------------
  registerTechnician(payload: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/technician-register`, payload);
  }

  // ---------------------------------------------------------
  // TECHNICIAN LOGIN
  // ---------------------------------------------------------
  loginTechnician(credentials: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/Auth/technician-login`, credentials).pipe(
      tap((res: AuthResponse) => {
        if (res.success && res.token) {
          this.saveAuthData(res.token, 'Technician', res.user?.name);
          this.userRole$.next('Technician');
          this.router.navigate(['/technician/dashboard']);
        }
      })
    );
  }

  // ---------------------------------------------------------
  // SAVE AUTH DATA IN LOCALSTORAGE
  // ---------------------------------------------------------
  private saveAuthData(token: string, role: string, username?: string) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.roleKey, role);
    localStorage.setItem(this.userNameKey, username || 'User');
    this.userRole$.next(role);
  }

  // ---------------------------------------------------------
  // AUTH HELPERS
  // ---------------------------------------------------------
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRole(): string | null {
    return localStorage.getItem(this.roleKey);
  }

  getUserName(): string {
    return localStorage.getItem(this.userNameKey) || 'User';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // ---------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------
  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.roleKey);
    localStorage.removeItem(this.userNameKey);
    this.userRole$.next(null);
    this.router.navigate(['/login']);
  }
}

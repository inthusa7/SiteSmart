
// src/app/shared/services/admin-users.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ListUsersOptions {
  q?: string;
  role?: string | null;
  page?: number;
  pageSize?: number;
}

export interface UserListItem {
  userId: number;
  fullName: string;
  email: string;
  phone?: string | null;
  role: string;
  status?: string | null;
  createdAt?: string | null;
  emailConfirmed?: boolean;
  technician?: any | null;
  admin?: any | null;
}

export interface UserDetail extends UserListItem {
  technician?: {
    technicianID?: number;
    profileImage?: string | null;
    verificationStatus?: string | null;
    experienceYears?: number;
    ratingAverage?: number;
    totalRatings?: number;
    availabilityStatus?: string | null;
    walletBalance?: number | null;
  } | null;
  admin?: {
    adminID?: number;
    adminLevel?: string | null;
    canManageUsers?: boolean | null;
    canManageServices?: boolean | null;
    canViewReports?: boolean | null;
  } | null;
}

export interface PagedUsersResponse {
  items: UserListItem[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  // fallback if runtime env shim not present
  private apiRoot = (window as any).__env?.API_BASE_URL || 'http://localhost:5035/api';

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken') || '';
    let headers = new HttpHeaders();
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  listUsers(opts: ListUsersOptions = {}): Observable<PagedUsersResponse> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 12;

    let params = new HttpParams()
      .set('page', String(page))
      .set('size', String(pageSize)); // backend uses 'size' param (per your controller)

    if (opts.role && opts.role !== 'All') params = params.set('role', opts.role);
    if (opts.q) params = params.set('search', opts.q);

    const headers = this.authHeaders();

    return this.http.get<any>(`${this.apiRoot}/admin/users`, { params, headers })
      .pipe(
        map(resp => {
          // expected backend shape: { success, total, page, size, users }
          const itemsRaw = resp?.users ?? resp?.items ?? resp?.data ?? [];
          const total = Number(resp?.total ?? resp?.totalCount ?? 0);
          const pageResp = Number(resp?.page ?? page);
          const sizeResp = Number(resp?.size ?? resp?.pageSize ?? pageSize);

          const normalized: UserListItem[] = (itemsRaw as any[]).map(u => ({
            userId: u.userID ?? u.UserID ?? u.id ?? u.userId,
            fullName: u.fullName ?? u.FullName ?? u.full_name ?? '',
            email: u.email ?? u.Email ?? '',
            phone: u.phone ?? u.Phone ?? null,
            role: u.role ?? u.Role ?? 'Customer',
            status: u.status ?? u.Status ?? null,
            createdAt: u.createdAt ?? u.CreatedAt ?? null,
            emailConfirmed: u.emailConfirmed ?? u.EmailConfirmed ?? false,
            technician: u.technician ?? u.Technician ?? null,
            admin: u.admin ?? u.Admin ?? null
          }));

          return {
            items: normalized,
            total,
            page: pageResp,
            pageSize: sizeResp
          } as PagedUsersResponse;
        })
      );
  }

  getUser(userId: number): Observable<UserDetail> {
    const headers = this.authHeaders();
    return this.http.get<any>(`${this.apiRoot}/admin/users/${userId}`, { headers })
      .pipe(
        map(resp => {
          // backend returns { success: true, user: { ... } } or direct user object
          const u = resp?.user ?? resp;
          const detail: UserDetail = {
            userId: u.userID ?? u.UserID ?? u.id ?? u.userId,
            fullName: u.fullName ?? u.FullName ?? '',
            email: u.email ?? u.Email ?? '',
            phone: u.phone ?? u.Phone ?? null,
            role: u.role ?? u.Role ?? 'Customer',
            status: u.status ?? u.Status ?? null,
            createdAt: u.createdAt ?? u.CreatedAt ?? null,
            emailConfirmed: u.emailConfirmed ?? u.EmailConfirmed ?? false,
            technician: u.technician ?? u.Technician ?? null,
            admin: u.admin ?? u.Admin ?? null
          };
          return detail;
        })
      );
  }
}
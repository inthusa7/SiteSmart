// src/app/admin/notifications/admin-notifications.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AdminNotificationItem {
  notificationID: number;
  title: string;
  message: string;
  category?: string | null;
  targetType?: string | null;
  targetRole?: string | null;
  targetUserID?: number | null;
  createdAt: string;
}

export interface ListResponse {
  success: boolean;
  total: number;
  page: number;
  size: number;
  items: AdminNotificationItem[];
  message?: string;
}

export interface CreateNotificationPayload {
  title: string;
  message: string;
  category?: string | null;
  targetType: string;      // "All" | "Role" | "User"
  targetRole?: string | null;
  targetUserId?: number | null;
}

export interface CreateResponse {
  success: boolean;
  message: string;
  data?: AdminNotificationItem;
}

@Injectable({ providedIn: 'root' })
export class AdminNotificationsService {
  private apiRoot = (environment.apiBaseUrl || '').replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  createNotification(payload: CreateNotificationPayload): Observable<CreateResponse> {
    return this.http.post<CreateResponse>(
      `${this.apiRoot}/admin/notifications`,
      payload
    );
  }

  listNotifications(category: string | null, page: number, size: number): Observable<ListResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (category) {
      params = params.set('category', category);
    }

    return this.http.get<ListResponse>(
      `${this.apiRoot}/admin/notifications`,
      { params }
    );
  }
}

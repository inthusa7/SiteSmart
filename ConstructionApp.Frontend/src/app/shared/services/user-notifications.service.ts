// src/app/shared/services/user-notifications.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserNotificationItem {
  notificationUserId: number;
  notificationId: number;
  title: string;
  message: string;
  category?: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface UserNotificationsResponse {
  success: boolean;
  items: UserNotificationItem[];
  message?: string;
}

export interface MarkReadResponse {
  success: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class UserNotificationsService {
  private apiRoot = (environment.apiBaseUrl || '').replace(/\/$/, '');

  constructor(private http: HttpClient) {}

  getMyNotifications(unreadOnly = false): Observable<UserNotificationsResponse> {
    let params = new HttpParams().set('unreadOnly', unreadOnly);
    return this.http.get<UserNotificationsResponse>(
      `${this.apiRoot}/notifications/my`,
      { params }
    );
  }

  markAsRead(notificationUserId: number): Observable<MarkReadResponse> {
    return this.http.post<MarkReadResponse>(
      `${this.apiRoot}/notifications/${notificationUserId}/read`,
      {}
    );
  }
}

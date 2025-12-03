// src/app/technician/technician.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type UpdateStatusPayload = { status: string };

/**
 * TechnicianService - flexible signatures so current components compile
 */
@Injectable({
  providedIn: 'root'
})
export class TechnicianService {
  private apiUrl = 'https://localhost:5035.com/api'; // <- set to your backend

  constructor(private http: HttpClient) {}

  // getAssignedJobs(technicianId?) -> supports calls with or without id
  getAssignedJobs(technicianId?: number): Observable<any> {
    if (typeof technicianId === 'number') {
      return this.http.get(`${this.apiUrl}/technicians/${technicianId}/jobs`);
    }
    return this.http.get(`${this.apiUrl}/technicians/me/jobs`);
  }

  // getDashboard(technicianId?) -> supports calls with or without id
  getDashboard(technicianId?: number): Observable<any> {
    if (typeof technicianId === 'number') {
      return this.http.get(`${this.apiUrl}/technicians/${technicianId}/dashboard`);
    }
    return this.http.get(`${this.apiUrl}/technicians/me/dashboard`);
  }

  /**
   * uploadDocument: flexible call handling
   * Preferred usage: uploadDocument(technicianId: number, formData: FormData)
   * But this will also accept uploadDocument(formData) if you ever accidentally pass only FormData.
   */
  uploadDocument(arg1: number | FormData, arg2?: FormData): Observable<any> {
    let technicianId: number | undefined;
    let formData: FormData | undefined;

    if (arg1 instanceof FormData) {
      // called as uploadDocument(formData)
      formData = arg1 as FormData;
    } else {
      technicianId = arg1 as number;
      formData = arg2;
    }

    if (!formData) {
      throw new Error('uploadDocument requires a FormData (and ideally a technicianId).');
    }

    const target = typeof technicianId === 'number'
      ? `${this.apiUrl}/technicians/${technicianId}/documents`
      : `${this.apiUrl}/technicians/me/documents`;

    return this.http.post(target, formData);
  }

  /**
   * Accept job (example)
   */
  acceptJob(bookingId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/bookings/${bookingId}/accept`, {});
  }

  /**
   * updateStatus accepts either a string status or an object {status:string}
   * so both `updateStatus(id, 'Done')` and `updateStatus(id, {status: 'Done'})` compile.
   */
  updateStatus(bookingId: number, statusOrPayload: string | UpdateStatusPayload): Observable<any> {
    const payload: UpdateStatusPayload =
      typeof statusOrPayload === 'string' ? { status: statusOrPayload } : statusOrPayload;
    return this.http.put(`${this.apiUrl}/bookings/${bookingId}/status`, payload);
  }
  getCategories() {
  return this.http.get<string[]>(`${this.apiUrl}/admin/categories`);
}

}

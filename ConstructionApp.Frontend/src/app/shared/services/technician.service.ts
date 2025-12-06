// src/app/shared/services/technician.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export type UpdateStatusPayload = { status: string };

@Injectable({
  providedIn: 'root'
})
export class TechnicianService {
  // keep base consistent with AuthService
  private apiUrl = 'http://localhost:5035/api';

  constructor(private http: HttpClient, private auth: AuthService) {}

  private authHeaders(): { headers?: HttpHeaders } {
    const token = this.auth.getToken();
    return token ? { headers: new HttpHeaders({ Authorization: `Bearer ${token}` }) } : {};
  }

  // Assigned jobs (supports /technicians/me/jobs or /technicians/{id}/jobs)
  getAssignedJobs(technicianId?: number): Observable<any> {
    const url = typeof technicianId === 'number'
      ? `${this.apiUrl}/technicians/${technicianId}/jobs`
      : `${this.apiUrl}/technicians/me/jobs`;

    return this.http.get(url, this.authHeaders());
  }

  // Dashboard (supports /technicians/me/dashboard or /technicians/{id}/dashboard)
  getDashboard(technicianId?: number): Observable<any> {
    const url = typeof technicianId === 'number'
      ? `${this.apiUrl}/technicians/${technicianId}/dashboard`
      : `${this.apiUrl}/technicians/me/dashboard`;

    return this.http.get(url, this.authHeaders());
  }

  /**
   * uploadDocument
   * Preferred: uploadDocument(technicianId: number, formData: FormData)
   * Or: uploadDocument(formData: FormData) -> uses /technicians/me/documents
   */
  // --- uploadDocument: send only FormData, backend reads user from JWT ---
  uploadDocument(formData: FormData): Observable<any> {
    const token = this.auth.getToken();
    return this.http.post(`${this.apiUrl}/technician/upload-document`, formData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }


  // Accept job example
  acceptJob(bookingId: number): Observable<any> {
    const url = `${this.apiUrl}/bookings/${bookingId}/accept`;
    return this.http.post(url, {}, this.authHeaders());
  }

  // Update booking status
  updateStatus(bookingId: number, statusOrPayload: string | UpdateStatusPayload): Observable<any> {
    const payload: UpdateStatusPayload =
      typeof statusOrPayload === 'string' ? { status: statusOrPayload } : statusOrPayload;
    const url = `${this.apiUrl}/bookings/${bookingId}/status`;
    return this.http.put(url, payload, this.authHeaders());
  }

  // list categories (admin/public endpoint)
  getCategories(): Observable<string[]> {
    const url = `${this.apiUrl}/admin/categories`;
    return this.http.get<string[]>(url, this.authHeaders());
  }

  // optional helpers used elsewhere
  getVerifyDetails(): Observable<any> {
    const token = this.auth.getToken();
    return this.http.get(`${this.apiUrl}/technician/verify-details`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
  uploadVerification(params: {
  nicFile?: File | null;
  certificateFile?: File | null;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  experienceYears?: number | null;
  categories?: string[]; // names
}): Observable<any> {
  const fd = new FormData();
  if (params.nicFile) fd.append('nic', params.nicFile, params.nicFile.name);
  if (params.certificateFile) fd.append('certificate', params.certificateFile, params.certificateFile.name);

  if (params.street) fd.append('street', params.street);
  if (params.city) fd.append('city', params.city);
  if (params.state) fd.append('state', params.state);
  if (params.postalCode) fd.append('postalCode', params.postalCode);
  if (params.country) fd.append('country', params.country);

  if (params.experienceYears !== undefined && params.experienceYears !== null) {
    fd.append('experienceYears', String(params.experienceYears));
  }

  if (params.categories && params.categories.length > 0) {
    // server accepts 'categories' JSON string (we made controller accept both)
    fd.append('categories', JSON.stringify(params.categories));
  }

  const token = this.auth.getToken();
  const headers: any = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return this.http.post(`${this.apiUrl}/technician/upload-document`, fd, { headers });
}

}

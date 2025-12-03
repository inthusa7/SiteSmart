// src/app/shared/services/category.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface CategoryDto {
  categoryID: number;
  categoryName: string;
  description?: string;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private apiUrl = 'http://localhost:5035/api'; // adjust base API URL if needed

  constructor(private http: HttpClient) {}

  private getAuthHeaders(token?: string) {
    const headersConfig: any = { 'Content-Type': 'application/json' };
    if (token) headersConfig['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(headersConfig);
  }

  // If you already have an AuthInterceptor that adds the Authorization header,
  // you can remove the headers option and call this.http.get(this.apiUrl + '/admin/categories')
  getAllForAuth(token?: string): Observable<CategoryDto[]> {
    const url = `${this.apiUrl}/admin/categories`;
    return this.http.get<CategoryDto[]>(url, { headers: this.getAuthHeaders(token) })
      .pipe(catchError(err => {
        console.error('Failed to load categories', err);
        return of([]);
      }));
  }

  // convenience returning only names
  getNames(token?: string) {
    return this.getAllForAuth(token).pipe(
      // map(list => list.map(c => c.categoryName))  // import map if you need
    );
  }
}

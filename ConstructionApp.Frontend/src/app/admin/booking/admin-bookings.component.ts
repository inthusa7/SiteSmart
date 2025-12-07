// src/app/admin/booking/admin-bookings.component.ts
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

interface Booking {
  bookingID: number;
  serviceName: string;
  customerName: string;
  technicianName?: string | null;
  totalAmount: number;
  status: string;
  preferredStartDateTime: string;
  preferredEndDateTime?: string | null;
}

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-bookings.component.html',
  styleUrls: ['./admin-bookings.component.css']
})
export class AdminBookingsComponent implements OnInit {
  bookings: Booking[] = [];
  searchTerm = '';

  private apiUrl = (environment.apiBaseUrl || '').replace(/\/$/, '') + '/bookings/admin/all';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadBookings();
  }

  loadBookings() {
    this.http.get<any>(this.apiUrl).subscribe({
      next: res => {
        this.bookings = res?.data || [];
      },
      error: err => {
        console.error('Failed to load bookings', err);
        this.bookings = [];
      }
    });
  }

  get filteredBookings() {
    if (!this.searchTerm.trim()) return this.bookings;
    const term = this.searchTerm.toLowerCase();
    return this.bookings.filter(b =>
      b.serviceName.toLowerCase().includes(term) ||
      b.customerName.toLowerCase().includes(term) ||
      (b.technicianName || '').toLowerCase().includes(term)
    );
  }
}

// src/app/customer/booking/booking.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { forkJoin } from 'rxjs';

interface ServiceDto {
  serviceID: number;
  serviceName: string;
  description?: string | null;
  fixedRate: number;
  estimatedDuration: number;
  imageUrl?: string | null;
}

interface CartItem {
  service: ServiceDto;
  quantity: number;
}

interface CalendarDay {
  day: number | string;
  disabled?: boolean;
  selected?: boolean;
}

interface Address {
  addressID?: number;
  AddressID?: number;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
  IsDefault?: boolean;
}

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking.component.html',
  styleUrls: ['./booking.component.css']
})
export class BookingComponent implements OnInit {
  step: number = 1;
  services: ServiceDto[] = [];
  cart: CartItem[] = [];
  selectedDate = '';
  selectedTime = '';
  customerAddress: Address | null = null;

  // SUCCESS SCREEN REAL DATA
  bookingSummary: CartItem[] = [];
  confirmedDate = '';
  confirmedTime = '';
  confirmedTotal = 0;

  isLoading = true;
  addressLoading = true;
  error = '';

  // Calendar
  currentMonth = '';
  currentYear = 0;
  currentMonthIndex = 0;
  calendarDays: CalendarDay[] = [];

  timeSlots: string[] = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
    '05:00 PM', '06:00 PM'
  ];

  private apiUrl = (environment.apiBaseUrl || '').replace(/\/$/, '');

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initCalendar();
    this.loadServices();
    this.loadCustomerAddress();
  }

  // ====================== CALENDAR ======================
  private initCalendar(): void {
    const today = new Date();
    this.currentYear = today.getFullYear();
    this.currentMonthIndex = today.getMonth();
    this.currentMonth = today.toLocaleString('default', { month: 'long' });
    this.generateCalendar();
  }

  generateCalendar(): void {
    const firstDay = new Date(this.currentYear, this.currentMonthIndex, 1).getDay();
    const daysInMonth = new Date(this.currentYear, this.currentMonthIndex + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.calendarDays = [];

    for (let i = 0; i < firstDay; i++) {
      this.calendarDays.push({ day: '', disabled: true });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(this.currentYear, this.currentMonthIndex, day);
      date.setHours(0, 0, 0, 0);
      const isPast = date < today;

      this.calendarDays.push({
        day,
        disabled: isPast,
        selected: this.selectedDate === `${day} ${this.currentMonth} ${this.currentYear}`
      });
    }
  }

  previousMonth(): void {
    if (this.currentMonthIndex === 0) {
      this.currentMonthIndex = 11;
      this.currentYear--;
    } else this.currentMonthIndex--;
    this.currentMonth = new Date(this.currentYear, this.currentMonthIndex).toLocaleString('default', { month: 'long' });
    this.generateCalendar();
  }

  nextMonth(): void {
    if (this.currentMonthIndex === 11) {
      this.currentMonthIndex = 0;
      this.currentYear++;
    } else this.currentMonthIndex++;
    this.currentMonth = new Date(this.currentYear, this.currentMonthIndex).toLocaleString('default', { month: 'long' });
    this.generateCalendar();
  }

  selectDate(day: CalendarDay): void {
    if (day.disabled || typeof day.day !== 'number') return;
    this.calendarDays.forEach(d => d.selected = false);
    day.selected = true;
    this.selectedDate = `${day.day} ${this.currentMonth} ${this.currentYear}`;
  }

  // ====================== API ======================
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');
    return token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : new HttpHeaders();
  }

  loadServices(): void {
    this.isLoading = true;
    this.http.get<ServiceDto[]>(`${this.apiUrl}/admin/services`, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (data) => {
          this.services = data || [];
          this.isLoading = false;
        },
        error: () => {
          this.error = 'Failed to load services.';
          this.isLoading = false;
        }
      });
  }

  loadCustomerAddress(): void {
    this.addressLoading = true;
    this.http.get<any>(`${this.apiUrl}/addresses/my`, { headers: this.getAuthHeaders() })
      .subscribe({
        next: (res) => {
          const addresses = Array.isArray(res) ? res : res.data || res.addresses || [];
          this.customerAddress = addresses.find((a: any) => a.isDefault || a.IsDefault) || addresses[0] || null;
          this.addressLoading = false;
        },
        error: () => {
          this.customerAddress = null;
          this.addressLoading = false;
        }
      });
  }

  getImageUrl(service: ServiceDto): string | null {
    if (!service.imageUrl) return null;
    if (service.imageUrl.startsWith('http')) return service.imageUrl;
    const base = this.apiUrl.replace(/\/api$/, '');
    const path = service.imageUrl.startsWith('/') ? service.imageUrl : `/uploads/${service.imageUrl}`;
    return `${base}${path}`;
  }

  formatPrice(price: number): string {
    return 'Rs. ' + price.toLocaleString('en-IN');
  }

  // ====================== CART ======================
  getCartItem(serviceId: number): CartItem | undefined {
    return this.cart.find(i => i.service.serviceID === serviceId);
  }

  addToCart(service: ServiceDto): void {
    const existing = this.getCartItem(service.serviceID);
    if (existing) existing.quantity++;
    else this.cart.push({ service, quantity: 1 });
  }

  increaseQty(serviceId: number): void {
    const item = this.getCartItem(serviceId);
    if (item) item.quantity++;
  }

  decreaseQty(serviceId: number): void {
    const item = this.getCartItem(serviceId);
    if (item && item.quantity > 1) item.quantity--;
    else this.removeFromCart(serviceId);
  }

  removeFromCart(serviceId: number): void {
    this.cart = this.cart.filter(i => i.service.serviceID !== serviceId);
  }

  get totalAmount(): number {
    return this.cart.reduce((sum, item) => sum + (item.service.fixedRate * item.quantity), 0);
  }

  get totalItems(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  goToSchedule(): void {
    if (this.cart.length === 0) {
      alert('Please select at least one service!');
      return;
    }
    this.step = 2;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ====================== BOOKING ======================
  initiateBooking(): void {
    if (!this.selectedDate || !this.selectedTime) {
      alert('Please select date and time!');
      return;
    }
    if (!this.customerAddress) {
      alert('No address found! Please add one in your profile.');
      this.router.navigate(['/customer/profile']);
      return;
    }
    this.createBookings();
  }

  private createBookings(): void {
    const addressId = this.customerAddress!.addressID || this.customerAddress!.AddressID!;
    const preferredStart = this.formatDateTime();

    const requests = this.cart.map(item => {
      const payload = {
        ServiceID: item.service.serviceID,
        Quantity: item.quantity,
        Description: `${item.service.serviceName} × ${item.quantity}`,
        AddressID: addressId,
        PreferredStartDateTime: preferredStart,
        PreferredEndDateTime: this.calculateEndTime(preferredStart, item.service.estimatedDuration, item.quantity)
      };

      return this.http.post(`${this.apiUrl}/bookings`, payload, {
        headers: this.getAuthHeaders().set('Content-Type', 'application/json')
      });
    });

    forkJoin(requests).subscribe({
      next: () => {
        // SUCCESS: Save data for Step 3 BEFORE clearing cart!
        this.bookingSummary = [...this.cart];
        this.confirmedDate = this.selectedDate;
        this.confirmedTime = this.selectedTime;
        this.confirmedTotal = this.totalAmount;

        this.step = 3;
        this.cart = []; // Now safe to clear
      },
      error: (err) => {
        console.error('Booking failed:', err);
        alert('Booking failed: ' + (err.error?.message || 'Server error'));
      }
    });
  }

  private formatDateTime(): string {
    const [day, monthName, year] = this.selectedDate.split(' ');
    const monthIndex = new Date(Date.parse(`${monthName} 1, ${year}`)).getMonth();
    const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(+day).padStart(2, '0')}`;

    let [time, period] = this.selectedTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  }

  private calculateEndTime(start: string, durationHours: number, quantity: number): string {
    const end = new Date(start);
    end.setHours(end.getHours() + (durationHours * quantity));
    return end.toISOString();
  }

  // ====================== NAVIGATION ======================
  goBackToDashboard(): void {
    this.router.navigate(['/customer/dashboard']);
  }

  changeAddress(): void {
    this.router.navigate(['/customer/profile']);
  }

  goToProfile(): void {
    this.router.navigate(['/customer/profile']);
  }

  initiatePayment(): void {
    this.initiateBooking();
  }
}
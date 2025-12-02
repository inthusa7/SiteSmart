// src/app/customer/profile/profile.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../shared/services/auth.service';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { Subscription, forkJoin } from 'rxjs';
import { Router } from '@angular/router';

declare const cloudinary: any;

interface Address {
  addressID: number;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  user = { name: '', email: '', phone: '', avatar: '' };
  addresses: Address[] = [];
  notifications = { bookingConfirmation: true, statusUpdates: true, offers: false };

  isLoading = true;
  showAddForm = false;
  isEditMode = false;
  currentEditId = 0;

  newAddress: Partial<Address> = {
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'Sri Lanka',
    isDefault: false
  };

  private apiUrl = environment.apiBaseUrl.replace(/\/$/, '');
  private subs = new Subscription();

  private cloudinaryConfig = {
    cloud_name: 'dxbhnpgd4',
    upload_preset: 'construction_app',
    folder: 'constructpro/profiles',
    cropping: true,
    multiple: false,
    sources: ['local', 'camera'],
    client_allowed_formats: ['png', 'jpg', 'jpeg', 'webp']
  };

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : new HttpHeaders();
  }

  private loadAllData(): void {
    if (!this.auth.isLoggedIn()) {
      alert('Session expired! Please login again.');
      this.auth.logout();
      return;
    }

    const token = this.auth.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    const headers = this.getHeaders();

    // Load Profile + Addresses in parallel (Super Fast!)
    const profile$ = this.http.get<any>(`${this.apiUrl}/customer/profile`, { headers });
    const addresses$ = this.http.get<any>(`${this.apiUrl}/addresses/my`, { headers });

    this.subs.add(
      forkJoin([profile$, addresses$]).subscribe({
        next: ([profileRes, addressRes]) => {
          // Profile
          if (profileRes?.success && profileRes?.data) {
            const data = profileRes.data;
            this.user = {
              name: data.fullName || data.name || 'User',
              email: data.email || '',
              phone: data.phone || '',
              avatar: data.profileImage || this.getDefaultAvatar(data.fullName || 'User')
            };
            localStorage.setItem('userName', this.user.name);
            localStorage.setItem('userEmail', this.user.email);
          }

          // Addresses - Only THIS user's addresses!
          const rawAddresses = this.normalizeAddressResponse(addressRes);
          this.addresses = rawAddresses.map((a: any) => ({
            addressID: a.addressID || a.AddressID || a.id || 0,
            street: a.street || '',
            city: a.city || '',
            state: a.state || '',
            postalCode: a.postalCode || '',
            country: a.country || 'Sri Lanka',
            isDefault: !!a.isDefault || !!a.IsDefault
          })).filter(a => a.addressID > 0 && a.street.trim());

          this.isLoading = false;
        },
        error: (err) => {
          console.error('Profile/Address load failed:', err);
          this.loadFromLocalStorage();
          this.isLoading = false;
        }
      })
    );
  }

  private normalizeAddressResponse(res: any): any[] {
    if (Array.isArray(res)) return res;
    if (res?.data && Array.isArray(res.data)) return res.data;
    if (res?.addresses && Array.isArray(res.addresses)) return res.addresses;
    return [];
  }

  private getDefaultAvatar(name: string = 'User'): string {
    const encoded = encodeURIComponent(name.trim() || 'User');
    return `https://ui-avatars.com/api/?name=${encoded}&background=8b5cf6&color=fff&bold=true&size=256&rounded=true`;
  }

  private loadFromLocalStorage(): void {
    this.user.name = localStorage.getItem('userName') || 'User';
    this.user.email = localStorage.getItem('userEmail') || '';
    this.user.avatar = this.getDefaultAvatar(this.user.name);
  }

  onImgError(event: any): void {
    event.target.src = this.getDefaultAvatar(this.user.name);
  }

  openAddForm(): void {
    this.isEditMode = false;
    this.resetForm();
    this.showAddForm = true;
  }

  openEditModal(addr: Address): void {
    this.isEditMode = true;
    this.currentEditId = addr.addressID;
    this.newAddress = { ...addr };
    this.showAddForm = true;
  }

  saveAddress(): void {
    if (!this.newAddress.street?.trim() || !this.newAddress.city?.trim() || !this.newAddress.postalCode?.trim()) {
      alert('Please fill Street, City & Postal Code!');
      return;
    }

    const payload = {
      street: this.newAddress.street!.trim(),
      city: this.newAddress.city!.trim(),
      state: this.newAddress.state?.trim() || null,
      postalCode: this.newAddress.postalCode!.trim(),
      country: this.newAddress.country || 'Sri Lanka',
      isDefault: !!this.newAddress.isDefault
    };

    const url = this.isEditMode
      ? `${this.apiUrl}/addresses/${this.currentEditId}`
      : `${this.apiUrl}/addresses`;

    const request = this.isEditMode
      ? this.http.put(url, payload, { headers: this.getHeaders() })
      : this.http.post(url, payload, { headers: this.getHeaders() });

    request.subscribe({
      next: () => {
        alert(this.isEditMode ? 'Address updated!' : 'Address added!');
        this.showAddForm = false;
        this.loadAllData();
      },
      error: (err) => alert('Save failed: ' + (err.error?.message || 'Try again'))
    });
  }

  setDefaultAddress(id: number): void {
    this.http.patch(`${this.apiUrl}/addresses/${id}/default`, {}, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => this.loadAllData(),
      error: () => alert('Failed to set default')
    });
  }

  deleteAddress(id: number): void {
    if (!confirm('Delete this address permanently?')) return;

    this.http.delete(`${this.apiUrl}/addresses/${id}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        this.addresses = this.addresses.filter(a => a.addressID !== id);
        alert('Address deleted!');
      },
      error: () => alert('Delete failed')
    });
  }

  resetForm(): void {
    this.newAddress = {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Sri Lanka',
      isDefault: false
    };
  }

  changeProfileImage(): void {
    if (typeof cloudinary === 'undefined') {
      alert('Image upload not available. Please try again later.');
      return;
    }

    cloudinary.openUploadWidget(this.cloudinaryConfig, (error: any, result: any) => {
      if (error) {
        console.error('Cloudinary error:', error);
        return;
      }
      if (result?.event === 'success') {
        const url = result.info.secure_url;
        this.user.avatar = url;
        this.saveProfileImage(url);
      }
    });
  }

  private saveProfileImage(url: string): void {
    this.http.patch(`${this.apiUrl}/customer/profile/image`, { profileImage: url }, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => console.log('Profile image updated'),
      error: () => alert('Image save failed')
    });
  }

  saveProfile(): void {
    const payload = {
      fullName: this.user.name.trim(),
      phone: this.user.phone.trim(),
      profileImage: this.user.avatar
    };

    this.http.put(`${this.apiUrl}/customer/profile`, payload, {
      headers: this.getHeaders()
    }).subscribe({
      next: () => {
        alert('Profile updated successfully!');
        localStorage.setItem('userName', this.user.name);
      },
      error: () => alert('Update failed! Try again.')
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/customer/dashboard']);
  }
}
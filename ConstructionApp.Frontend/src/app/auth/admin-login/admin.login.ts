import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NgIcon } from "@ng-icons/core";

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgIcon],
  templateUrl: './admin.login.html',
  styleUrls: ['./admin.login.css']
})
export class AdminLoginComponent {
  email = 'sitesmart025@gmail.com';
  password = 'Admin@123';
  showPassword = false;
  loading = false;
  error = '';
  currentYear = new Date().getFullYear();

  private apiUrl = 'http://localhost:5035/api/auth/admin-login';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (!this.email?.trim()) {
      this.error = 'Please enter your email';
      return;
    }
    if (!this.password) {
      this.error = 'Please enter your password';
      return;
    }

    this.loading = true;
    this.error = '';

    this.http.post<any>(this.apiUrl, {
      email: this.email.trim().toLowerCase(),
      password: this.password
    }, {
      // மிக முக்கியம்! CORS + Credentials
      withCredentials: true
    })
    .subscribe({
      next: (res) => {
        console.log('Login Response:', res); // Debug

        if (res.success && res.token) {
          // Token & User Info Save
          localStorage.setItem('adminToken', res.token);
          localStorage.setItem('adminName', res.name || 'Admin');
          localStorage.setItem('adminEmail', res.email);
          localStorage.setItem('adminLevel', res.adminLevel || 'SuperAdmin');
          localStorage.setItem('adminRole', 'Admin');

          // Success → Dashboard
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.error = res.message || 'Login failed. Please try again.';
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('Login Error:', err);

        if (err.status === 401) {
          this.error = 'Invalid email or password';
        } else if (err.status === 0) {
          this.error = 'Cannot connect to server. Check if backend is running.';
        } else {
          this.error = err.error?.message || 'Login failed. Try again later.';
        }
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  // // Icon getter
  // get eyeIcon() {
  //   return this.showPassword ? EyeOff : Eye;
  // }
}

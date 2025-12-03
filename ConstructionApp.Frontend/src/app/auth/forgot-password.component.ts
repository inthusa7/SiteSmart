import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  loading = false;
  success = '';
  error = '';

  private apiUrl = 'http://localhost:5035/api/auth/forgot';

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    if (!this.email) {
      this.error = 'Please enter your email.';
      return;
    }

    this.loading = true;
    this.success = '';
    this.error = '';

    this.http.post<{ message?: string }>(`${this.apiUrl}/forgot`, { email: this.email }).subscribe({
      next: (res) => {
        this.success = res?.message || 'Reset link sent (if the email exists).';
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to send reset link. Please try again.';
        this.loading = false;
      }
    });
  }
}

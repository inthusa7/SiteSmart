// src/app/auth/technician-login.component.ts
import { Component, ViewEncapsulation } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { tap } from 'rxjs/operators';
import { NgIcon } from "@ng-icons/core";

interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  role?: string;
  redirectUrl?: string;
}

@Component({
  selector: 'app-technician-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, NgIcon],
  templateUrl: './technician-login.component.html',
  styleUrls: ['./technician-login.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class TechnicianLoginComponent {
  form: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = {
      email: this.form.get('email')!.value as string,
      password: this.form.get('password')!.value as string
    };

    this.loading = true;

    // call existing login endpoint
    this.auth.login(payload)
      .pipe(
        // optional tap to ensure token saved if AuthService.login doesn't already
        tap((res: AuthResponse) => {
          if (res && res.success && res.token) {
            // ensure token + role are stored (AuthService.login usually does this, but we double-check)
            try {
              localStorage.setItem('token', res.token);
              if (res.role) localStorage.setItem('role', res.role);
            } catch (e) {
              // ignore localStorage errors
            }
          }
        })
      )
      .subscribe({
        next: (res: AuthResponse) => {
          this.loading = false;

          if (!res) {
            this.errorMessage = 'Unexpected server response';
            return;
          }

          if (!res.success) {
            // API returned a failure message (invalid credentials, etc.)
            this.errorMessage = res.message ?? 'Login failed';
            return;
          }

          // Role check: allow only Technician access on this page
          const role = (res.role ?? localStorage.getItem('role') ?? '').toLowerCase();
          if (role !== 'technician') {
            // remove token saved by accident
            try { localStorage.removeItem('token'); localStorage.removeItem('role'); } catch {}
            this.errorMessage = 'This login page is for Technicians only. Use the appropriate login page.';
            return;
          }

          // Success: Navigate to technician dashboard
          this.router.navigate(['/technician/dashboard']);
        },
        error: (err: any) => {
          this.loading = false;
          // Prefer server-sent message
          this.errorMessage = err?.error?.message ?? 'Login failed. Please try again.';
        }
      });
  }
}

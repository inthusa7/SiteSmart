// technician-register.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../shared/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-technician-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: 'technician-register.component.html',
  styleUrls: ['./technician-register.component.css']
})
export class TechnicianRegisterComponent {
  registerForm: FormGroup;
  loading = false;
  serverError = '';
  successMessage = '';
  passwordStrength = 0;
  showPassword = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator = (group: FormGroup) => {
    return group.get('password')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  updatePasswordStrength() {
    const pass = this.registerForm.get('password')?.value || '';
    let s = 0;
    if (pass.length >= 8) s += 20;
    if (/[A-Z]/.test(pass)) s += 20;
    if (/[a-z]/.test(pass)) s += 20;
    if (/[0-9]/.test(pass)) s += 20;
    if (/[^A-Za-z0-9]/.test(pass)) s += 20;
    this.passwordStrength = s;
  }

  register() {
    if (this.registerForm.invalid || this.passwordStrength < 100) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.serverError = '';
    this.successMessage = '';

    const payload = {
      fullName: this.registerForm.get('fullName')?.value,
      email: this.registerForm.get('email')?.value,
      phone: this.registerForm.get('phone')?.value,
      password: this.registerForm.get('password')?.value
    };

    this.auth.registerTechnician(payload).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.successMessage = 'Registered successfully. Check your email for verification. Admin will verify your profile.';
          // Optionally auto-redirect to login
          setTimeout(() => this.router.navigate(['/technician/login']), 2500);
        } else {
          this.serverError = res.message || 'Registration failed';
        }
      },
      error: (err) => {
        this.loading = false;
        this.serverError = err.error?.message || 'Registration failed';
      }
    });
  }
}

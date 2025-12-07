// src/app/auth/register.component.ts
import { Component } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormGroup } from '@angular/forms';
import { AuthService, AuthResponse } from '../shared/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NgIcon } from "@ng-icons/core";

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgIcon],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  serverError = '';
  successMessage = '';
  loading = false;
  passwordStrength = 0; // 0 to 100
  showPassword = false;

  isTechnicianRegister = false;

 constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    // Check if URL is /technician-register or has ?type=technician
    this.activatedRoute.url.subscribe(url => {
      this.isTechnicianRegister = url[0]?.path === 'technician-register';
    });

    this.activatedRoute.queryParams.subscribe(params => {
      if (params['type'] === 'technician') {
        this.isTechnicianRegister = true;
      }
    });

    this.registerForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[\d]{10}$/)]],
      password: ['', [Validators.required, Validators.minLength(8), this.passwordComplexityValidator.bind(this)]],
      confirmPassword: ['', Validators.required],
      role: ['Customer', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  // TOGGLE PASSWORD VISIBILITY (ADD THIS METHOD)
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // UPDATE STRENGTH ON INPUT (ADD THIS METHOD)
  updatePasswordStrength() {
    const pass = this.registerForm.get('password')?.value || '';
    let strength = 0;
    if (pass.length >= 8) strength += 20;
    if (/[A-Z]/.test(pass)) strength += 20;
    if (/[a-z]/.test(pass)) strength += 20;
    if (/[0-9]/.test(pass)) strength += 20;
    if (/[^A-Za-z0-9]/.test(pass)) strength += 20;
    this.passwordStrength = strength;
  }

  // Password complexity + strength meter
  passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value || '';
    if (!value) {
      this.passwordStrength = 0;
      return null;
    }

    let strength = 0;
    if (value.length >= 8) strength += 20;
    if (/[A-Z]/.test(value)) strength += 20;
    if (/[a-z]/.test(value)) strength += 20;
    if (/[0-9]/.test(value)) strength += 20;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(value)) strength += 20;

    this.passwordStrength = strength;

    const isValid = strength === 100;
    return isValid ? null : { passwordComplexity: true };
  }

  // Confirm password match
  passwordMatchValidator = (group: FormGroup) => {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  };

  // REGISTER SUBMIT
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
      password: this.registerForm.get('password')?.value,
      role: this.registerForm.get('role')?.value
    };

    this.auth.register(payload).subscribe({
      next: (res: AuthResponse) => {
        this.loading = false;
        if (res.success) {
          this.successMessage = 'Registration successful! Please check your email to verify your account.';
          setTimeout(() => this.router.navigate(['/login']), 4000);
        } else {
          this.serverError = res.message || 'Registration failed';
        }
      },
      error: (err: { error: { message: string; }; }) => {
        this.loading = false;
        this.serverError = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

  // Error Messages
  get nameErrors(): string {
    const c = this.registerForm.get('fullName');
    if (c?.hasError('required')) return 'Full name is required';
    if (c?.hasError('minlength')) return 'Name must be at least 2 characters';
    return '';
  }

  get emailErrors(): string {
    const c = this.registerForm.get('email');
    if (c?.hasError('required')) return 'Email is required';
    if (c?.hasError('email')) return 'Enter a valid email address';
    return '';
  }

  get phoneErrors(): string {
    const c = this.registerForm.get('phone');
    if (c?.hasError('required')) return 'Phone number is required';
    if (c?.hasError('pattern')) return 'Enter a valid 10-digit phone number';
    return '';
  }

  get passwordErrors(): string {
    const c = this.registerForm.get('password');
    if (!c?.touched) return '';
    const errors: string[] = [];
    if (c?.hasError('required')) errors.push('Password is required');
    if (c?.hasError('minlength')) errors.push('Minimum 8 characters');
    if (c?.hasError('passwordComplexity')) {
      errors.push('Must include: Uppercase, lowercase, number, special character');
    }
    return errors.join(' | ');
  }

  get confirmErrors(): string {
    const c = this.registerForm.get('confirmPassword');
    if (!c?.touched) return '';
    if (c?.hasError('required')) return 'Please confirm your password';
    if (this.registerForm.errors?.['mismatch']) return 'Passwords do not match';
    return '';
  }
}

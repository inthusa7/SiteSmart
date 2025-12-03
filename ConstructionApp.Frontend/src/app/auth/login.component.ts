// src/app/auth/login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../shared/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgIcon } from "@ng-icons/core";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, NgIcon],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  // FIX 1: Initialize fb first
  private fb = new FormBuilder();

  // FIX 2: Now form can be initialized safely
  form = this.fb.group({
    email: [' ', [Validators.required, Validators.email]],
    password: [' ', [
      Validators.required,
      Validators.minLength(8),
      this.passwordComplexityValidator.bind(this)
    ]]
  });

  errorMessage: string = '';
  loading = false;
  showPassword = false;

  constructor(

    private auth: AuthService,
    private router: Router
  ) {}

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  passwordComplexityValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

    return (hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar) ? null : { passwordComplexity: true };
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // FIX 3: Safe way to pass form value
    const loginData = {
      email: this.form.get('email')?.value || '',
      password: this.form.get('password')?.value || ''
    };

    this.auth.login(loginData).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.success) {
          localStorage.setItem('userName', res.user?.name || 'User');
          localStorage.setItem('role', res.user?.role || 'Customer');

          const route = res.user?.role === 'Technician'
            ? '/technician/dashboard'
            : '/customer/dashboard';
          this.router.navigate([route]);
        } else {
          this.errorMessage = res.message || 'Login failed';
        }
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message
          || err.error?.error
          || err.message
          || 'Invalid email or password. Please try again.';

        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  get emailErrors(): string {
    const control = this.form.get('email');
    if (control?.touched) {
      if (control.hasError('required')) return 'Email is required';
      if (control.hasError('email')) return 'Invalid email format';
    }
    return '';
  }

  get passwordErrors(): string {
    const control = this.form.get('password');
    if (!control?.touched) return '';
    const errors: string[] = [];
    if (control.hasError('required')) errors.push('Password is required');
    if (control.hasError('minlength')) errors.push('At least 8 characters');
    if (control.hasError('passwordComplexity')) {
      errors.push('Must contain uppercase, lowercase, number & special character');
    }
    return errors.join(', ');
  }
}

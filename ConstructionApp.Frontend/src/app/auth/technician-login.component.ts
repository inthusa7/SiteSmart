// src/app/auth/technician-login.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../shared/services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-technician-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './technician-login.component.html',
  styleUrls: ['./technician-login.component.css']
})
export class TechnicianLoginComponent {
  form: FormGroup;
  loading = false;
  errorMessage = '';
  showPassword = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    // initialize the form inside the constructor (fixes "used before initialization")
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    // Use non-null assertion so TS knows these are strings
    const data = {
      email: this.form.get('email')!.value as string,
      password: this.form.get('password')!.value as string
    };

    this.auth.loginTechnician(data).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          // AuthService already stores token & technicianId
          this.router.navigate(['/technician/dashboard']);
        } else {
          this.errorMessage = res.message || 'Login failed';
        }
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Login failed';
      }
    });
  }
}

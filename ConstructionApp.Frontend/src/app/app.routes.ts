// src/app/app.routes.ts
import { Routes } from '@angular/router';

// Public Components
import { HomeComponent } from './home/home';
import { ServicesCatalogComponent } from './home/services-catalog.component';

// Auth Components
import { LoginComponent } from './auth/login.component';
import { RegisterComponent } from './auth/register.component';
import { VerifyComponent } from './auth/verify.component';
import { ResendVerificationComponent } from './auth/resend-verification.component';
import { ForgotPasswordComponent } from './auth/forgot-password.component';
import { ResetPasswordComponent } from './auth/reset-password.component';
import { AdminLoginComponent } from './auth/admin-login/admin.login';

// Guards
import { AdminGuard } from './shared/guards/admin.guard';
import { AuthGuard } from './shared/guards/auth.guard';

// Admin Components
import { AdminLayoutComponent } from './admin/admin-layout/admin.layout';
import { AdminDashboardComponent } from './admin/dashboard';
import { ServicesManagementComponent } from './admin/service/services-management.component';
import { AdminUsersComponent } from './admin/users/admin-users.component';
import { AdminBookingsComponent } from './admin/booking/admin-bookings.component';

// Customer Components
import { CustomerDashboardComponent } from './customer/dashboard.component';
import { ProfileComponent } from './customer/profile/profile.component';
import { BookingComponent } from './customer/booking/booking.component';

// Technician
import { TechnicianVerifyDocComponent } from './technician/verify/technician-verify-doc.component';
import { TechnicianLoginComponent } from './auth/technician-login/technician-login.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },

  // Public services catalog
  { path: 'services', component: ServicesCatalogComponent },

  // Authentication
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'technician-login', component: TechnicianLoginComponent },
  { path: 'technician-register', component: RegisterComponent },
  { path: 'verify/:token', component: VerifyComponent },
  { path: 'resend-verification', component: ResendVerificationComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset/:token', component: ResetPasswordComponent },

  // Admin Login
  { path: 'admin-login', component: AdminLoginComponent },
  { path: 'admin/dashboard', component: AdminDashboardComponent },

  // Admin Protected Area
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [AdminGuard],
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'service', component: ServicesManagementComponent },
      { path: 'users', component: AdminUsersComponent },
      { path: 'booking', component: AdminBookingsComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Customer Protected Area
  {
    path: 'customer',
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', component: CustomerDashboardComponent },
      { path: 'booking', component: BookingComponent },
      { path: 'profile', component: ProfileComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Technician Public (Login, Register)
  {
    path: 'technician/login',
    loadComponent: () =>
      import('./auth/technician-login/technician-login.component').then(m => m.TechnicianLoginComponent)
  },
  {
    path: 'technician/register',
    loadComponent: () =>
      import('./auth/technician-register/technician-register.component').then(m => m.TechnicianRegisterComponent)
  },

  // Technician Protected Area
  {
    path: 'technician',
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./technician/dashboard.component').then(m => m.TechnicianDashboardComponent)
      },
      {
      path: 'verify',
      // if TechnicianVerifyDocComponent is standalone you can reference it directly:
      component: TechnicianVerifyDocComponent
      // OR use loadComponent for lazy:
      // loadComponent: () => import('./technician/verify/technician-verify-doc.component').then(m => m.TechnicianVerifyDocComponent)
    },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Fallback
  { path: '**', redirectTo: '/home' }
];

// src/app/admin/layout/admin-layout.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIcon } from "@ng-icons/core";

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, NgIcon],
  templateUrl: './admin.layout.html',
  styleUrls: ['./admin.layout.css']
})
export class AdminLayoutComponent {

  constructor(private router: Router) {}   // ✅ inject Router

  // logout() {
  //   localStorage.removeItem('auth_token');
  //   localStorage.removeItem('role');
  //   this.router.navigate(['/login']);      // ✅ Now works
  // }
}

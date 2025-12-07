// src/main.ts – 100% WORKING ICON FIX!
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideIcons } from '@ng-icons/core';
import {
  lucideLayoutDashboard, lucideUsers, lucideWrench, lucideCalendarCheck,
  lucideDollarSign, lucideBell, lucideHistory, lucidePlus, lucideSearch,
  lucideEdit3, lucideTrash2, lucideLoader2, lucideUpload, lucideX,
  lucideImage, lucideFolderOpen, lucideInbox, lucidePackage,

  // ⭐ ADD THESE
  lucideEye, lucideEyeOff
} from '@ng-icons/lucide';


bootstrapApplication(AppComponent, {
  providers: [
    ...appConfig.providers,
   provideIcons({
  lucideLayoutDashboard, lucideUsers, lucideWrench, lucideCalendarCheck,
  lucideDollarSign, lucideBell, lucideHistory, lucidePlus, lucideSearch,
  lucideEdit3, lucideTrash2, lucideLoader2, lucideUpload, lucideX,
  lucideImage, lucideFolderOpen, lucideInbox, lucidePackage,

  // ⭐ REGISTER THEM
  lucideEye,
  lucideEyeOff
})
  ]
}).catch(err => console.error(err));

import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  AbstractControl
} from '@angular/forms';
import { AuthService } from '../../shared/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  @Output() saved = new EventEmitter<void>();

  profileForm!: FormGroup;
  submitting = false;

  avatarPreview = this.getDefaultAvatar('User'); // implement getDefaultAvatar below

  avatarFile: File | null = null;

  showPasswordSection = false;
  showAddressSection = false;

  constructor(private fb: FormBuilder, private auth: AuthService) {}

  ngOnInit() {
    this.initForm();
    this.loadProfile();
  }

  // -------------------------------
  // FORM INITIALIZATION
  // -------------------------------
  private initForm() {
    this.profileForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],

      address: this.fb.group({
        street: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        postalCode: ['', Validators.required],
        country: ['Sri Lanka']
      }),

      passwordGroup: this.fb.group(
        {
          currentPassword: [''],
          newPassword: ['', [Validators.minLength(6)]],
          confirmPassword: ['']
        },
        { validators: [this.passwordsMatchValidator] }
      )
    });
  }

  // -------------------------------
  // GETTERS
  // -------------------------------
  get passwordGroup(): FormGroup {
    return this.profileForm.get('passwordGroup') as FormGroup;
  }

  get fullName() { return this.profileForm.get('fullName'); }
  get email() { return this.profileForm.get('email'); }
  get phone() { return this.profileForm.get('phone'); }
  get address() { return this.profileForm.get('address'); }
  get newPassword() { return this.passwordGroup.get('newPassword'); }
  get confirmPassword() { return this.passwordGroup.get('confirmPassword'); }

  // -------------------------------
  // LOAD USER DATA INTO FORM
  // -------------------------------
  loadProfile() {
  const user = this.auth.getCurrentUser();
  if (!user) return;

  this.avatarPreview = user.profileImage || '/assets/avatar.png';

  // Load basic user data
  this.profileForm.patchValue({
    fullName: user.fullName,
    email: user.email,
    phone: user.phone
  });

  // 🔥 NOW LOAD ADDRESS FROM API
  this.auth.getMyAddress().subscribe({
    next: (addr: any) => {
      console.log("Fetched address:", addr);

      if (addr) {
        this.profileForm.patchValue({
          address: {
            street: addr.street || '',
            city: addr.city || '',
            state: addr.state || '',
            postalCode: addr.postalCode || '',
            country: addr.country || 'Sri Lanka'
          }
        });
      }
    },
    error: err => console.error("Address load error:", err)
  });
}



  // -------------------------------
  // PASSWORD VALIDATION
  // -------------------------------
  passwordsMatchValidator(group: AbstractControl) {
    const newPwd = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!newPwd && !confirm) return null;
    return newPwd === confirm ? null : { mismatch: true };
  }

  // -------------------------------
  // AVATAR UPLOAD + PREVIEW
  // -------------------------------
  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;

    this.avatarFile = file;

    const reader = new FileReader();
    reader.onload = () => (this.avatarPreview = reader.result as string);
    reader.readAsDataURL(file);
  }

  uploadAvatar(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!this.avatarFile) return resolve(null);

    const form = new FormData();
    form.append('file', this.avatarFile);

    this.auth.uploadTechnicianAvatar(form).subscribe({
      next: (res: any) => {
        const url = res?.data?.url || res?.url || null;
        resolve(url);
      },
      error: () => resolve(null)
    });
  });
}



  resetAvatar() {
    this.avatarFile = null;
    this.avatarPreview = '/assets/avatar.png';
  }

  // -------------------------------
  // SHOW / HIDE SECTIONS
  // -------------------------------
  togglePasswordSection() {
    this.showPasswordSection = !this.showPasswordSection;
    if (!this.showPasswordSection) {
      this.passwordGroup.reset();
    }
  }

  toggleAddressSection() {
    this.showAddressSection = !this.showAddressSection;
  }

  // -------------------------------
  // SAVE PROFILE
  // -------------------------------
  async saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    // handle avatar upload first
    let uploadedImageUrl = await this.uploadAvatar();

    const payload: any = {
      fullName: this.profileForm.value.fullName,
      email: this.profileForm.value.email,
      phone: this.profileForm.value.phone,

      address: {
        street: this.profileForm.value.address.street,
        city: this.profileForm.value.address.city,
        state: this.profileForm.value.address.state,
        postalCode: this.profileForm.value.address.postalCode,
        country: this.profileForm.value.address.country
      }
    };

    if (uploadedImageUrl) {
      payload.profileImage = uploadedImageUrl;
    }

    // Password change
    const pw = this.passwordGroup.value;
    if (pw.newPassword) {
      payload.currentPassword = pw.currentPassword;
      payload.newPassword = pw.newPassword;
    }

    // Send to backend
    this.auth.updateTechnicianProfile(payload).subscribe({
      next: (res: any) => {
  const pw = this.passwordGroup.value;

  // If password changed → logout
  if (pw.newPassword) {
    alert("Password changed successfully! Please login again.");
    this.auth.logout();
    return;
  }

  // Update UI with new profile data
  this.auth.updateCurrentUser({
    fullName: payload.fullName,
    phone: payload.phone,
    profileImage: uploadedImageUrl ?? undefined
  });

  alert("Profile updated successfully!");
  this.submitting = false;
  this.saved.emit();
},


      error: (err) => {
        console.error(err);
        alert(err.error?.message ?? 'Profile update failed!');
        this.submitting = false;
      }
    });
  }

  // -------------------------------
  // RESET FORM
  // -------------------------------
  resetForm() {
    this.profileForm.reset({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      passwordGroup: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }
    });
    this.resetAvatar();
    this.showPasswordSection = false;
  }
  private getDefaultAvatar(name: string): string {
  const n = encodeURIComponent((name || 'User').trim());
  return `https://ui-avatars.com/api/?name=${n}&background=8b5cf6&color=fff&bold=true&size=256&rounded=true`;
}

}

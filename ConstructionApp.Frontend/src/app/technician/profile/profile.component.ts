// src/app/technician/profile/profile.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup,
  AbstractControl
} from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {
  @Output() saved = new EventEmitter<void>();

  profileForm!: FormGroup;
  submitting = false;

  // Avatar preview / file
  avatarPreview = '/assets/avatar.png';
  avatarFile: File | null = null;

  // show/hide password controls
  showPasswordSection = false;

  constructor(private fb: FormBuilder) {
    // initialize form in constructor (fb is available here)
    this.profileForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      address: [''],
      // nested password group
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

  // typed getter so template can bind [formGroup]="passwordGroup"
  get passwordGroup(): FormGroup {
    return this.profileForm.get('passwordGroup') as FormGroup;
  }

  // convenience getters
  get fullName() { return this.profileForm.get('fullName'); }
  get email() { return this.profileForm.get('email'); }
  get phone() { return this.profileForm.get('phone'); }
  get address() { return this.profileForm.get('address'); }
  get newPassword() { return this.passwordGroup.get('newPassword'); }
  get confirmPassword() { return this.passwordGroup.get('confirmPassword'); }

  // toggle the password section UI (and clear values when hiding)
  togglePasswordSection() {
    this.showPasswordSection = !this.showPasswordSection;
    if (!this.showPasswordSection) {
      this.passwordGroup.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
      this.passwordGroup.markAsPristine();
      this.passwordGroup.markAsUntouched();
    }
  }

  // validator to ensure new & confirm match (returns null when ok)
  passwordsMatchValidator(group: AbstractControl) {
    const newPwd = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (!newPwd && !confirm) return null; // no change requested
    return newPwd === confirm ? null : { mismatch: true };
  }

  // Avatar file selected -> preview
  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    this.avatarFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  resetAvatar() {
    this.avatarFile = null;
    this.avatarPreview = '/assets/avatar.png';
  }

  // Save (simulate). Replace with API/service call as needed.
  saveProfile() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.submitting = true;

    // Build payload
    const payload: any = {
      fullName: this.profileForm.value.fullName,
      email: this.profileForm.value.email,
      phone: this.profileForm.value.phone,
      address: this.profileForm.value.address
    };

    const pw = this.passwordGroup.value;
    if (pw?.newPassword) {
      payload.currentPassword = pw.currentPassword;
      payload.newPassword = pw.newPassword;
    }

    // if avatarFile present, upload via FormData in real API
    // const form = new FormData(); form.append('avatar', this.avatarFile);

    // simulate API delay
    setTimeout(() => {
      this.submitting = false;
      this.saved.emit();
    }, 900);
  }

  // Reset entire form (clear avatar too)
  resetForm() {
    this.profileForm.reset({
      fullName: '',
      email: '',
      phone: '',
      address: '',
      passwordGroup: { currentPassword: '', newPassword: '', confirmPassword: '' }
    });
    this.resetAvatar();
    this.showPasswordSection = false;
  }
}

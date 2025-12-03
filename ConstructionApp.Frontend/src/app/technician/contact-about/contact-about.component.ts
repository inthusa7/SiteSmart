// src/app/technician/contact-about/contact-about.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-contact-about',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-about.component.html',
  styleUrls: ['./contact-about.component.css']
})
export class ContactAboutComponent {
  @Output() saved = new EventEmitter<void>();

  contactForm!: FormGroup;
  submitting = false;
  statusMsg = '';

  constructor(private fb: FormBuilder) {
    // initialize form inside constructor (fb is available here)
    this.contactForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      facebook: [''],
      twitter: [''],
      about: ['', [Validators.maxLength(1000)]]
    });
  }

  save() {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.statusMsg = 'Please fill required fields correctly.';
      return;
    }

    this.submitting = true;
    this.statusMsg = '';

    // Simulate API call — replace with your service
    setTimeout(() => {
      this.submitting = false;
      this.statusMsg = 'Saved successfully.';
      this.saved.emit();
      setTimeout(() => (this.statusMsg = ''), 2500);
    }, 900);
  }

  resetForm() {
    this.contactForm.reset();
    this.statusMsg = '';
  }
}

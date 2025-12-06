import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

import { TechnicianService } from '../../shared/services/technician.service';
import { AuthService } from '../../shared/services/auth.service';
import { CategoryService, CategoryDto } from '../../shared/services/category.service';

@Component({
  selector: 'app-technician-verify-doc',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './technician-verify-doc.component.html',
  styleUrls: ['./technician-verify-doc.component.css']
})
export class TechnicianVerifyDocComponent implements OnInit {
  verifyForm!: FormGroup;
  submitting = false;
  statusMsg = '';

  isLoading = false;
  loadingCategories = false;
  categoriesList: string[] = [];
  categoriesSelected: string[] = [];

  nicFileName: string | null = null;
  certFileName: string | null = null;

  constructor(
    private fb: FormBuilder,
    private techService: TechnicianService,
    private auth: AuthService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.createForm();
    this.loadCategories();

    // try to load existing verify data (address, files etc)
    this.loadVerifyData();

    // Also try to auto-fill address from AuthService/getMyAddress if available
    // Some backends provide a dedicated endpoint
    this.tryLoadAddressFromAuth();
  }

  private createForm() {
    this.verifyForm = this.fb.group({
      address: this.fb.group({
        street: ['', Validators.required],
        city: ['', Validators.required],
        state: ['', Validators.required],
        postalCode: ['', Validators.required],
        country: ['Sri Lanka', Validators.required]
      }),

      experienceYears: ['', [Validators.required, Validators.min(0)]],
      category: [''],

      nic: [null],
      certificate: [null]
    });
  }

  loadCategories(): void {
    this.loadingCategories = true;
    this.categoryService.getAllForAuth().pipe(
      finalize(() => (this.loadingCategories = false))
    ).subscribe({
      next: (list: CategoryDto[] | any) => {
        const arr = (list || []) as CategoryDto[];
        this.categoriesList = arr.filter(c => c.isActive !== false).map(c => c.categoryName);
      },
      error: (err: any) => {
        console.error('Failed to load categories', err);
        this.categoriesList = [];
      }
    });
  }

  toggleCategory(cat: string): void {
    const idx = this.categoriesSelected.indexOf(cat);
    if (idx === -1) this.categoriesSelected.push(cat);
    else this.categoriesSelected.splice(idx, 1);
  }

  onFileSelect(event: Event, field: 'nic' | 'certificate'): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) return;

    if (file.type !== 'application/pdf') {
      this.statusMsg = 'Only PDF files are allowed for documents.';
      if (input) input.value = '';
      return;
    }

    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.statusMsg = 'File too large. Max 5MB.';
      if (input) input.value = '';
      return;
    }

    this.verifyForm.patchValue({ [field]: file });
    if (field === 'nic') this.nicFileName = file.name;
    if (field === 'certificate') this.certFileName = file.name;
    this.statusMsg = '';
  }

  // Attempt to auto-fill address from auth.getMyAddress or currentUser
  private tryLoadAddressFromAuth(): void {
    // 1) If current user has address in token -> patch
    const cu = this.auth.getCurrentUser();
    if (cu?.address) {
      this.verifyForm.patchValue({ address: cu.address });
      return;
    }

    // 2) Try dedicated API endpoint if available
    this.auth.getMyAddress().pipe(finalize(() => {})).subscribe({
      next: (res: any) => {
        const addr = res?.data ?? res;
        if (addr) {
          this.verifyForm.patchValue({
            address: {
              street: addr.street ?? '',
              city: addr.city ?? '',
              state: addr.state ?? '',
              postalCode: addr.postalCode ?? '',
              country: addr.country ?? 'Sri Lanka'
            }
          });
        }
      },
      error: () => {
        // ignore — server might not have endpoint
      }
    });
  }

  // Submit documents to backend
  submit(): void {
  // basic validation
  if (this.verifyForm.invalid) {
    this.statusMsg = 'Please fill required fields.';
    return;
  }

  const addr = this.verifyForm.get('address')?.value;
  const nicFile: File | null = this.verifyForm.get('nic')?.value ?? null;
  const certFile: File | null = this.verifyForm.get('certificate')?.value ?? null;

  const payload = {
    nicFile,
    certificateFile: certFile,
    street: addr.street,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
    experienceYears: Number(this.verifyForm.get('experienceYears')?.value) || null,
    categories: this.categoriesSelected
  };

  this.submitting = true;
  this.techService.uploadVerification(payload).subscribe({
    next: (res: any) => {
      this.submitting = false;
      this.statusMsg = 'Documents submitted — waiting admin verification.';
      // optionally refresh data
      this.loadVerifyData();
    },
    error: (err: any) => {
      this.submitting = false;
      console.error('Upload error', err);
      this.statusMsg = err?.error?.message ?? 'Failed to upload documents.';
    }
  });
}



  loadVerifyData(): void {
    this.isLoading = true;

    this.techService.getVerifyDetails().pipe(
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (res: any) => {
        const data = res?.data ?? res;
        if (!data) return;

        if (data.address) {
          this.verifyForm.patchValue({
            address: {
              street: data.address.street ?? '',
              city: data.address.city ?? '',
              state: data.address.state ?? '',
              postalCode: data.address.postalCode ?? '',
              country: data.address.country ?? 'Sri Lanka'
            }
          });
        }

        if (data.experienceYears !== undefined && data.experienceYears !== null) {
          this.verifyForm.patchValue({ experienceYears: data.experienceYears });
        }

        if (Array.isArray(data.categories)) {
          this.categoriesSelected = [...data.categories];
        }

        if (data.idProof) {
          this.nicFileName = data.idProof.split('/').pop();
        }
        if (data.certificate) {
          this.certFileName = data.certificate.split('/').pop();
        }
      },
      error: (err) => {
        console.error('Failed to load verification details', err);
      }
    });
  }
}

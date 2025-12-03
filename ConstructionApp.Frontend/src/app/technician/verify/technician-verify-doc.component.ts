import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

// Services (adjust paths if your project structure differs)
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

  // UI + data properties
  isLoading = false;             // used while loading categories or submitting
  loadingCategories = false;
  categoriesList: string[] = []; // names from backend
  categoriesSelected: string[] = [];

  // keep references to chosen files for UI if you want
  nicFileName: string | null = null;
  certFileName: string | null = null;

  constructor(
    private fb: FormBuilder,
    private techService: TechnicianService,
    private auth: AuthService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.verifyForm = this.fb.group({
      address: ['', Validators.required],
      experienceYears: ['', [Validators.required, Validators.min(0)]],
      // keep category as single control but we'll manage multiple selection separately (categoriesSelected)
      category: [''],
      nic: [null],         // we store File objects internally, not as text
      certificate: [null]
    });

    this.loadCategories();
  }

  // Load categories from backend (authenticated)
  loadCategories(): void {
    this.loadingCategories = true;
    // If you use an auth interceptor you don't need token; CategoryService should use interceptor or accept token
    this.categoryService.getAllForAuth().pipe(
      finalize(() => (this.loadingCategories = false))
    ).subscribe({
      next: (list: CategoryDto[] | any) => {
        const arr = (list || []) as CategoryDto[];
        this.categoriesList = arr.filter(c => c.isActive !== false).map(c => c.categoryName);
      },
      error: (err: any) => {
        console.error('Failed to load categories', err);
        this.categoriesList = []; // fallback
      }
    });
  }

  // toggle a category checkbox (multi-select)
  toggleCategory(cat: string): void {
    const idx = this.categoriesSelected.indexOf(cat);
    if (idx === -1) this.categoriesSelected.push(cat);
    else this.categoriesSelected.splice(idx, 1);
  }

  // file inputs
  onFileSelect(event: Event, field: 'nic' | 'certificate'): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) return;

    // Only allow PDF (your request)
    if (file.type !== 'application/pdf') {
      this.statusMsg = 'Only PDF files are allowed for documents.';
      // reset input UI (if desired)
      if (input) input.value = '';
      return;
    }

    // optional: size check (5MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.statusMsg = 'File too large. Max 5MB.';
      if (input) input.value = '';
      return;
    }

    // store file in reactive form
    this.verifyForm.patchValue({ [field]: file });
    if (field === 'nic') this.nicFileName = file.name;
    if (field === 'certificate') this.certFileName = file.name;

    // clear status message
    this.statusMsg = '';
  }

  // Submit documents to backend
  submit(): void {
    // ensure some categories selected
    if (this.categoriesSelected.length === 0) {
      this.statusMsg = 'Please select at least one service category.';
      return;
    }

    if (!this.verifyForm.get('address')?.value || !this.verifyForm.get('experienceYears')?.value) {
      this.statusMsg = 'Please fill required fields.';
      return;
    }

    const nicFile: File | null = this.verifyForm.get('nic')?.value ?? null;
    const certFile: File | null = this.verifyForm.get('certificate')?.value ?? null;

    if (!nicFile || !certFile) {
      this.statusMsg = 'Please upload both NIC and Work Certificate (PDF).';
      return;
    }

    this.submitting = true;
    this.statusMsg = '';

    const formData = new FormData();
    formData.append('address', this.verifyForm.get('address')?.value ?? '');
    formData.append('experienceYears', this.verifyForm.get('experienceYears')?.value ?? '');
    // send categories as JSON string — backend should parse it
    formData.append('categories', JSON.stringify(this.categoriesSelected));

    if (nicFile) formData.append('nic', nicFile, nicFile.name);
    if (certFile) formData.append('certificate', certFile, certFile.name);

    const user = (this.auth as any).getUser ? (this.auth as any).getUser() : (this.auth as any).currentUserValue;
    const userId = user?.userID ?? user?.id ?? null;
    if (!userId) {
      this.statusMsg = 'User not found. Please login again.';
      this.submitting = false;
      return;
    }

    this.techService.uploadDocument(userId, formData).pipe(
      finalize(() => (this.submitting = false))
    ).subscribe({
      next: (res: any) => {
        this.statusMsg = 'Documents submitted — waiting admin verification.';
        // optionally disable form or redirect
      },
      error: (err: any) => {
        console.error(err);
        this.statusMsg = err?.error?.message ?? 'Failed to upload documents.';
      }
    });
  }
}

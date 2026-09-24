import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { NAME_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@store/shared';
import { apiError } from '../shared/api-error';
import { AuthService } from './auth.service';
import { safeReturnUrl } from './return-url';

type Field = 'name' | 'email' | 'password';

@Component({
  selector: 'app-register-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
  ],
  templateUrl: './register-page.html',
  styleUrl: './auth-page.scss',
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from `?returnUrl=`. */
  readonly returnUrl = input<string>();

  protected readonly passwordMinLength = PASSWORD_MIN_LENGTH;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
  });
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    try {
      await this.auth.register(this.form.getRawValue());
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (err) {
      const body = apiError(err);
      const fields = Object.entries(body?.fields ?? {});
      if (fields.length > 0) {
        // Show server-side messages (e.g. "email already registered") on the fields themselves.
        for (const [field, message] of fields) {
          const control = this.form.controls[field as Field];
          control?.setErrors({ server: message });
          control?.markAsTouched();
        }
      } else {
        this.error.set(body?.message ?? 'Something went wrong. Please try again.');
      }
    } finally {
      this.submitting.set(false);
    }
  }
}

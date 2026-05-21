import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  private readonly http = inject(HttpClient);

  email = '';
  loading = false;
  sent = false;
  devToken = '';
  error = '';

  submit(): void {
    if (!this.email.trim()) return;
    this.loading = true;
    this.error = '';
    this.http.post<{ message: string; devToken?: string }>(
      `${environment.apiUrl}/auth/forgot-password`,
      { email: this.email.trim() },
    ).subscribe({
      next: (res) => {
        this.loading = false;
        this.sent = true;
        this.devToken = res.devToken ?? '';
      },
      error: (e) => {
        this.loading = false;
        this.error = e.error?.message || 'Error al procesar la solicitud';
      },
    });
  }
}

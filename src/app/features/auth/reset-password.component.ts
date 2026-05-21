import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  token = '';
  newPassword = '';
  confirmPassword = '';
  loading = false;
  done = false;
  error = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  get mismatch(): boolean {
    return this.confirmPassword.length > 0 && this.newPassword !== this.confirmPassword;
  }

  submit(): void {
    if (!this.token || !this.newPassword || this.mismatch) return;
    this.loading = true;
    this.error = '';
    this.http.post<{ message: string }>(
      `${environment.apiUrl}/auth/reset-password`,
      { token: this.token, newPassword: this.newPassword },
    ).subscribe({
      next: () => {
        this.loading = false;
        this.done = true;
      },
      error: (e) => {
        this.loading = false;
        this.error = e.error?.message || 'El token es inválido o expiró';
      },
    });
  }
}

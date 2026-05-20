import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { AuthResponse } from '../../core/models';

@Component({
  selector: 'app-registro-ciudadano',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro-ciudadano.component.html',
  styleUrl: './registro-ciudadano.component.scss',
})
export class RegistroCiudadanoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  form = this.fb.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  loading = false;
  error = '';

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.error = '';
    const body = { ...this.form.value, reparticionesIds: [], roles: [] };
    this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register-externo`, body).subscribe({
      next: () => this.router.navigate(['/login']),
      error: (e) => {
        this.loading = false;
        this.error = e.error?.message || 'Error al registrarse';
      },
    });
  }
}

import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DemoUser } from '../../core/models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  error = '';
  loading = false;
  showPassword = false;
  demoUsers: DemoUser[] = [];
  readonly showDemoLogin = environment.enableDemoLogin;
  readonly environment = environment;

  /** true durante los primeros 2s mientras se espera respuesta del servidor */
  checkingServer = true;
  /** true mientras corre el contador de 40s de warm-up */
  serverWaking = false;
  wakeCountdown = 40;
  private wakeInterval: ReturnType<typeof setInterval> | null = null;
  private checkTimeout: ReturnType<typeof setTimeout> | null = null;

  form = this.fb.nonNullable.group({
    email: ['admin@blueopendata.com', [Validators.required, Validators.email]],
    password: ['admin123', Validators.required],
  });

  ngOnInit(): void {
    if (this.showDemoLogin) {
      this.auth.listDemoUsers().subscribe({
        next: (users) => {
          this.demoUsers = users;
          this.checkingServer = false;
          // Si el servidor respondió mientras corría el warm-up, cancelarlo
          if (this.serverWaking) {
            this.stopWaking();
          }
        },
        error: () => {
          this.demoUsers = [];
          this.checkingServer = false;
        },
      });

      // Desbloquear la UI después de 2s independientemente de si la API respondió
      this.checkTimeout = setTimeout(() => (this.checkingServer = false), 2000);
    } else {
      this.checkingServer = false;
    }
  }

  ngOnDestroy(): void {
    if (this.wakeInterval) clearInterval(this.wakeInterval);
    if (this.checkTimeout) clearTimeout(this.checkTimeout);
  }

  wakeServer(): void {
    this.serverWaking = true;
    this.wakeCountdown = 40;

    // Lanzar petición para despertar Render
    this.auth.listDemoUsers().subscribe({
      next: (users) => {
        this.demoUsers = users;
        this.stopWaking();
      },
      error: () => {},
    });

    // Contador regresivo de 40 segundos
    this.wakeInterval = setInterval(() => {
      this.wakeCountdown--;
      if (this.wakeCountdown <= 0) {
        this.stopWaking();
        // Último intento al finalizar el contador
        this.auth.listDemoUsers().subscribe({
          next: (users) => (this.demoUsers = users),
          error: () => {},
        });
      }
    }, 1000);
  }

  private stopWaking(): void {
    this.serverWaking = false;
    if (this.wakeInterval) {
      clearInterval(this.wakeInterval);
      this.wakeInterval = null;
    }
  }

  onDemoSelect(email: string): void {
    if (!email) return;
    const isAdmin = email === 'admin@blueopendata.com';
    this.form.patchValue({
      email,
      password: isAdmin ? 'admin123' : (environment.demoPassword || 'demo123'),
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        const roles = this.auth.currentUser()?.roles ?? [];
        const dest = roles.includes('EXTERNO') && !roles.includes('USER') && !roles.includes('ADMIN')
          ? '/seguimiento' : '/bandeja';
        this.router.navigate([dest]);
      },
      error: () => {
        this.error = 'Credenciales inválidas';
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }
}

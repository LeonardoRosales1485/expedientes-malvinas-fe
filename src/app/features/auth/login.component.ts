import { Component, OnInit, inject } from '@angular/core';
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
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  error = '';
  loading = false;
  showPassword = false;
  demoUsers: DemoUser[] = [];
  readonly showDemoLogin = environment.enableDemoLogin;
  readonly environment = environment;

  form = this.fb.nonNullable.group({
    email: ['admin@blueopendata.com', [Validators.required, Validators.email]],
    password: ['admin123', Validators.required],
  });

  ngOnInit(): void {
    if (this.showDemoLogin) {
      this.auth.listDemoUsers().subscribe({
        next: (users) => (this.demoUsers = users),
        error: () => (this.demoUsers = []),
      });
    }
  }

  onDemoSelect(email: string): void {
    if (!email) return;
    this.form.patchValue({
      email,
      password: environment.demoPassword || 'demo123',
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

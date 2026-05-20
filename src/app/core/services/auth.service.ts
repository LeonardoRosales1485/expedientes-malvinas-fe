import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, DemoUser } from '../models';

const TOKEN_KEY = 'exp_token';
const USER_KEY = 'exp_user';
const ACTIVE_REP_KEY = 'exp_active_rep';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<AuthResponse | null>(this.loadUser());
  readonly activeReparticionId = signal<string | null>(localStorage.getItem(ACTIVE_REP_KEY));

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => this.persist(res)),
    );
  }

  setActiveReparticion(id: string | null): void {
    if (id) {
      localStorage.setItem(ACTIVE_REP_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_REP_KEY);
    }
    this.activeReparticionId.set(id);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.setActiveReparticion(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAdmin(): boolean {
    return this.currentUser()?.roles?.includes('ADMIN') ?? false;
  }

  /** Actualiza token y datos del usuario desde el servidor (p. ej. tras editar reparticiones). */
  refreshSession() {
    return this.http.get<AuthResponse>(`${environment.apiUrl}/auth/me`).pipe(tap((res) => this.persist(res)));
  }

  listDemoUsers() {
    return this.http.get<DemoUser[]>(`${environment.apiUrl}/auth/demo-users`);
  }

  private persist(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res));
    this.currentUser.set(res);
    const currentActive = this.activeReparticionId();
    if (currentActive && !res.reparticionesIds.includes(currentActive)) {
      this.setActiveReparticion(null);
    }
    if (!this.activeReparticionId() && res.reparticionesIds.length === 1) {
      this.setActiveReparticion(res.reparticionesIds[0]);
    }
  }

  private loadUser(): AuthResponse | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthResponse;
    } catch {
      return null;
    }
  }
}

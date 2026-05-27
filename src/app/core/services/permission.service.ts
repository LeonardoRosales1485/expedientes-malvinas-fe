import { Injectable, inject } from '@angular/core';
import { HistorialStep, Role } from '../models';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  hasRole(role: Role): boolean {
    return this.auth.currentUser()?.roles?.includes(role) ?? false;
  }

  isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  isCaratulador(): boolean {
    return this.hasRole('CARATULADOR');
  }

  isJefeDeArea(): boolean {
    return this.auth.currentUser()?.esJefeDeArea ?? false;
  }

  isViewerOnly(): boolean {
    const roles = this.auth.currentUser()?.roles ?? [];
    return roles.includes('VIEWER') && !roles.includes('USER') && !roles.includes('ADMIN') && !roles.includes('CARATULADOR');
  }

  canAccessAdmin(): boolean {
    return this.isAdmin();
  }

  canMutateExpediente(): boolean {
    if (this.isAdmin()) return true;
    if (this.isViewerOnly()) return false;
    if (this.hasRole('EXTERNO')) return true;
    return this.hasRole('USER');
  }

  canActOnReparticion(reparticionId: string): boolean {
    if (this.isAdmin()) return true;
    return (this.auth.currentUser()?.reparticionesIds ?? []).includes(reparticionId);
  }

  canActOnStep(step: HistorialStep | null | undefined): boolean {
    if (!step || step.estado !== 'pendiente') return false;
    if (!this.canMutateExpediente()) return false;
    return this.canActOnReparticion(step.reparticionId);
  }
}

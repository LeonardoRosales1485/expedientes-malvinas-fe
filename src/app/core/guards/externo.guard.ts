import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const externoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = auth.currentUser()?.roles ?? [];
  if (roles.includes('EXTERNO') && !roles.includes('ADMIN') && !roles.includes('USER')) {
    return router.createUrlTree(['/seguimiento']);
  }
  return true;
};

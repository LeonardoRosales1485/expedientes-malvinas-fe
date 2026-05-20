import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { PermissionService } from '../services/permission.service';

export const mutatorGuard: CanActivateFn = () => {
  const perm = inject(PermissionService);
  const router = inject(Router);
  if (perm.canMutateExpediente()) return true;
  return router.createUrlTree(['/bandeja']);
};

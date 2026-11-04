import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../services/auth';

export const restaurantGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  const user = authService.getUser();

  if (user?.role === 'RESTAURANTE' || user?.role === 'ADMIN') {
    return true;
  }

  return router.createUrlTree(['/restaurants']);
};

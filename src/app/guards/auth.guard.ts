import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  const router = inject(Router);
  return inject(AuthService).autenticado() ? true : router.createUrlTree(['/entrar']);
};

export const guestGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  const router = inject(Router);
  return inject(AuthService).autenticado() ? router.createUrlTree(['/painel']) : true;
};

import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  const router = inject(Router);
  const auth = inject(AuthService);
  if (!auth.autenticado()) {
    return router.createUrlTree(['/entrar']);
  }
  return auth.usuario()?.termosAceitos === false ? router.createUrlTree(['/aceitar-termos']) : true;
};

export const guestGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  const router = inject(Router);
  return inject(AuthService).autenticado() ? router.createUrlTree(['/painel']) : true;
};

export const termosGuard: CanActivateFn = () => {
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }
  const router = inject(Router);
  const auth = inject(AuthService);
  if (!auth.autenticado()) {
    return router.createUrlTree(['/entrar']);
  }
  return auth.usuario()?.termosAceitos === false ? true : router.createUrlTree(['/painel']);
};

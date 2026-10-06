import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('guards de autenticação', () => {
  const rota = {} as ActivatedRouteSnapshot;
  const estado = {} as RouterStateSnapshot;
  const autenticado = signal(false);

  function configurar(plataforma: 'browser' | 'server'): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: plataforma },
        { provide: AuthService, useValue: { autenticado } },
      ],
    });
  }

  function caminhoDe(resultado: unknown): string {
    return TestBed.inject(Router).serializeUrl(resultado as UrlTree);
  }

  beforeEach(() => autenticado.set(false));

  describe('authGuard', () => {
    it('redireciona para /entrar quando não há sessão', () => {
      configurar('browser');

      const resultado = TestBed.runInInjectionContext(() => authGuard(rota, estado));

      expect(caminhoDe(resultado)).toBe('/entrar');
    });

    it('libera quando há sessão', () => {
      configurar('browser');
      autenticado.set(true);

      expect(TestBed.runInInjectionContext(() => authGuard(rota, estado))).toBeTrue();
    });

    it('libera no servidor (a sessão só existe no navegador)', () => {
      configurar('server');

      expect(TestBed.runInInjectionContext(() => authGuard(rota, estado))).toBeTrue();
    });
  });

  describe('guestGuard', () => {
    it('libera quando não há sessão', () => {
      configurar('browser');

      expect(TestBed.runInInjectionContext(() => guestGuard(rota, estado))).toBeTrue();
    });

    it('redireciona para /painel quando já há sessão', () => {
      configurar('browser');
      autenticado.set(true);

      const resultado = TestBed.runInInjectionContext(() => guestGuard(rota, estado));

      expect(caminhoDe(resultado)).toBe('/painel');
    });

    it('libera no servidor', () => {
      configurar('server');
      autenticado.set(true);

      expect(TestBed.runInInjectionContext(() => guestGuard(rota, estado))).toBeTrue();
    });
  });
});

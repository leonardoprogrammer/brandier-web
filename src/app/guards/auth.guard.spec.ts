import { PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';

import { Usuario } from '../models/usuario.model';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard, termosGuard } from './auth.guard';

describe('guards de autenticação', () => {
  const rota = {} as ActivatedRouteSnapshot;
  const estado = {} as RouterStateSnapshot;
  const autenticado = signal(false);
  const usuario = signal<Usuario | null>(null);
  const usuarioComTermosPendentes: Usuario = { id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com', temSenha: true, termosAceitos: false };
  const usuarioComTermosAceitos: Usuario = { ...usuarioComTermosPendentes, termosAceitos: true };

  function configurar(plataforma: 'browser' | 'server'): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PLATFORM_ID, useValue: plataforma },
        { provide: AuthService, useValue: { autenticado, usuario } },
      ],
    });
  }

  function caminhoDe(resultado: unknown): string {
    return TestBed.inject(Router).serializeUrl(resultado as UrlTree);
  }

  beforeEach(() => {
    autenticado.set(false);
    usuario.set(null);
  });

  describe('authGuard', () => {
    it('redireciona para /entrar quando não há sessão', () => {
      configurar('browser');

      const resultado = TestBed.runInInjectionContext(() => authGuard(rota, estado));

      expect(caminhoDe(resultado)).toBe('/entrar');
    });

    it('libera quando há sessão e os termos já foram aceitos', () => {
      configurar('browser');
      autenticado.set(true);
      usuario.set(usuarioComTermosAceitos);

      expect(TestBed.runInInjectionContext(() => authGuard(rota, estado))).toBeTrue();
    });

    it('redireciona para /aceitar-termos quando os termos ainda não foram aceitos', () => {
      configurar('browser');
      autenticado.set(true);
      usuario.set(usuarioComTermosPendentes);

      const resultado = TestBed.runInInjectionContext(() => authGuard(rota, estado));

      expect(caminhoDe(resultado)).toBe('/aceitar-termos');
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

  describe('termosGuard', () => {
    it('redireciona para /entrar quando não há sessão', () => {
      configurar('browser');

      const resultado = TestBed.runInInjectionContext(() => termosGuard(rota, estado));

      expect(caminhoDe(resultado)).toBe('/entrar');
    });

    it('libera quando há sessão e os termos ainda não foram aceitos', () => {
      configurar('browser');
      autenticado.set(true);
      usuario.set(usuarioComTermosPendentes);

      expect(TestBed.runInInjectionContext(() => termosGuard(rota, estado))).toBeTrue();
    });

    it('redireciona para /painel quando os termos já foram aceitos', () => {
      configurar('browser');
      autenticado.set(true);
      usuario.set(usuarioComTermosAceitos);

      const resultado = TestBed.runInInjectionContext(() => termosGuard(rota, estado));

      expect(caminhoDe(resultado)).toBe('/painel');
    });

    it('libera no servidor', () => {
      configurar('server');

      expect(TestBed.runInInjectionContext(() => termosGuard(rota, estado))).toBeTrue();
    });
  });
});

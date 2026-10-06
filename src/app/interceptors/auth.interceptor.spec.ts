import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => controller.verify());

  it('renova a sessão e repete a requisição quando recebe 401', () => {
    let resposta: unknown;
    http.get('/api/v1/marca').subscribe((valor) => (resposta = valor));

    controller.expectOne('/api/v1/marca').flush(null, { status: 401, statusText: 'Unauthorized' });
    controller.expectOne('/api/v1/usuario/refresh-token').flush(null, { status: 204, statusText: 'No Content' });
    controller.expectOne('/api/v1/marca').flush({ ok: true });

    expect(resposta).toEqual({ ok: true });
  });

  it('várias requisições com 401 compartilham uma única renovação', () => {
    http.get('/api/v1/marca').subscribe();
    http.get('/api/v1/loja').subscribe();

    controller.expectOne('/api/v1/marca').flush(null, { status: 401, statusText: 'x' });
    controller.expectOne('/api/v1/loja').flush(null, { status: 401, statusText: 'x' });

    const renovacoes = controller.match('/api/v1/usuario/refresh-token');
    expect(renovacoes.length).toBe(1);
    renovacoes[0].flush(null, { status: 204, statusText: 'No Content' });

    controller.expectOne('/api/v1/marca').flush({});
    controller.expectOne('/api/v1/loja').flush({});
  });

  it('propaga o erro e leva ao login quando a renovação falha com o usuário autenticado', () => {
    auth.entrar('pessoa@exemplo.com', 'Senha1234').subscribe();
    controller
      .expectOne('/api/v1/usuario/login')
      .flush({ id: '1', nome: 'Pessoa', email: 'pessoa@exemplo.com' });

    let falhou = false;
    http.get('/api/v1/marca').subscribe({ error: () => (falhou = true) });
    controller.expectOne('/api/v1/marca').flush(null, { status: 401, statusText: 'x' });
    controller.expectOne('/api/v1/usuario/refresh-token').flush(null, { status: 401, statusText: 'x' });

    expect(falhou).toBeTrue();
    expect(auth.autenticado()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/entrar'], { queryParams: { sessaoExpirada: true } });
  });

  it('não redireciona quando a renovação falha sem usuário autenticado (carga inicial)', () => {
    http.get('/api/v1/usuario/eu').subscribe({ error: () => undefined });
    controller.expectOne('/api/v1/usuario/eu').flush(null, { status: 401, statusText: 'x' });
    controller.expectOne('/api/v1/usuario/refresh-token').flush(null, { status: 401, statusText: 'x' });

    expect(router.navigate).not.toHaveBeenCalled();
  });

  [
    '/api/v1/usuario/login',
    '/api/v1/usuario/logout',
    '/api/v1/usuario/refresh-token',
    '/api/v1/usuario',
    '/api/v1/usuario/verificar-email',
    '/api/v1/usuario/reenviar-verificacao',
  ].forEach((url) => {
    it(`não tenta renovar a sessão para ${url}`, () => {
      let falhou = false;
      http.post(url, null).subscribe({ error: () => (falhou = true) });

      controller.expectOne(url).flush(null, { status: 401, statusText: 'x' });

      expect(falhou).toBeTrue();
      controller.expectNone('/api/v1/usuario/refresh-token');
    });
  });

  it('não interfere em erros diferentes de 401', () => {
    let status = 0;
    http.get('/api/v1/marca').subscribe({ error: (erro: { status: number }) => (status = erro.status) });

    controller.expectOne('/api/v1/marca').flush(null, { status: 500, statusText: 'x' });

    expect(status).toBe(500);
    controller.expectNone('/api/v1/usuario/refresh-token');
  });
});

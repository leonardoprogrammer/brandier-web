import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Convite } from '../models/promotor.model';
import { ConviteService } from './convite.service';

describe('ConviteService', () => {
  const convite: Convite = {
    id: 'c1',
    email: 'nova@exemplo.com',
    status: 'PENDENTE',
    expiraEm: '2026-03-08T12:00:00Z',
    criadoEm: '2026-03-01T12:00:00Z',
  };
  let service: ConviteService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ConviteService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('convidar faz POST em /marcas/{marcaId}/convites com o e-mail', () => {
    service.convidar('m1', 'nova@exemplo.com').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/convites');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ email: 'nova@exemplo.com' });
    requisicao.flush(convite);
  });

  it('cancelar faz DELETE em /marcas/{marcaId}/convites/{id}', () => {
    service.cancelar('m1', 'c1').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/convites/c1');
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('consultar faz POST em /convites/consultar com o token no corpo', () => {
    service.consultar('abc').subscribe();

    const requisicao = http.expectOne('/api/v1/convites/consultar');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ token: 'abc' });
    requisicao.flush({ marcaNome: 'Alfa', gestorNome: 'Gestor', email: 'a@b.com', expiraEm: '2026-03-08T12:00:00Z' });
  });

  it('aceitar faz POST em /convites/aceitar com o token no corpo', () => {
    service.aceitar('abc').subscribe();

    const requisicao = http.expectOne('/api/v1/convites/aceitar');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ token: 'abc' });
    requisicao.flush({ marcaId: 'm1', marcaNome: 'Alfa', gestorNome: 'Gestor', entrouEm: '2026-03-01T12:00:00Z' });
  });

  it('recusar faz POST em /convites/recusar com o token no corpo', () => {
    service.recusar('abc').subscribe();

    const requisicao = http.expectOne('/api/v1/convites/recusar');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ token: 'abc' });
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('nunca coloca o token na URL', () => {
    service.consultar('segredo').subscribe();

    const requisicao = http.expectOne('/api/v1/convites/consultar');
    expect(requisicao.request.urlWithParams).not.toContain('segredo');
    requisicao.flush({});
  });
});

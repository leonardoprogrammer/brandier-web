import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MeusVinculos, PromotoresDaMarca } from '../models/promotor.model';
import { PromotorService } from './promotor.service';

describe('PromotorService', () => {
  let service: PromotorService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PromotorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar faz GET em /marcas/{marcaId}/promotores', () => {
    const resposta: PromotoresDaMarca = { promotores: [], convites: [], usadas: 0, limite: 5 };
    let recebido: PromotoresDaMarca | undefined;
    service.listar('m1').subscribe((valor) => (recebido = valor));

    const requisicao = http.expectOne('/api/v1/marcas/m1/promotores');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(resposta);

    expect(recebido).toEqual(resposta);
  });

  it('remover faz DELETE em /marcas/{marcaId}/promotores/{id}', () => {
    service.remover('m1', 'p1').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/promotores/p1');
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('meusVinculos faz GET em /promotores/eu', () => {
    const resposta: MeusVinculos = { vinculos: [] };
    let recebido: MeusVinculos | undefined;
    service.meusVinculos().subscribe((valor) => (recebido = valor));

    const requisicao = http.expectOne('/api/v1/promotores/eu');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(resposta);

    expect(recebido).toEqual(resposta);
  });

  it('sair faz DELETE em /promotores/eu/{marcaId}', () => {
    service.sair('m1').subscribe();

    const requisicao = http.expectOne('/api/v1/promotores/eu/m1');
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('codifica os ids na URL', () => {
    service.remover('a/b', 'c d').subscribe();

    http.expectOne('/api/v1/marcas/a%2Fb/promotores/c%20d').flush(null, { status: 204, statusText: 'No Content' });
  });
});

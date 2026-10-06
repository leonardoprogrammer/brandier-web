import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Loja, LojasDaMarca } from '../models/loja.model';
import { LojaService } from './loja.service';

describe('LojaService', () => {
  const loja: Loja = {
    id: 'l1',
    nome: 'Centro',
    cidade: 'Campinas',
    uf: 'SP',
    endereco: null,
    criadoEm: '2026-01-01T12:00:00Z',
  };
  const dados = { nome: 'Centro', cidade: 'Campinas', uf: 'SP', endereco: '' };
  let service: LojaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(LojaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar faz GET em /marcas/{marcaId}/lojas', () => {
    const resposta: LojasDaMarca = { lojas: [loja], limite: 5 };
    let recebido: LojasDaMarca | undefined;
    service.listar('m1').subscribe((valor) => (recebido = valor));

    const requisicao = http.expectOne('/api/v1/marcas/m1/lojas');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(resposta);

    expect(recebido).toEqual(resposta);
  });

  it('buscar faz GET em /marcas/{marcaId}/lojas/{id}', () => {
    service.buscar('m1', 'l1').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/lojas/l1');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(loja);
  });

  it('criar faz POST com os dados', () => {
    service.criar('m1', dados).subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/lojas');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual(dados);
    requisicao.flush(loja);
  });

  it('atualizar faz PUT com os dados', () => {
    service.atualizar('m1', 'l1', dados).subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/lojas/l1');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual(dados);
    requisicao.flush(loja);
  });

  it('excluir faz DELETE', () => {
    service.excluir('m1', 'l1').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/lojas/l1');
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('codifica os ids na URL', () => {
    service.buscar('a/b', 'c d').subscribe();

    http.expectOne('/api/v1/marcas/a%2Fb/lojas/c%20d').flush(loja);
  });
});

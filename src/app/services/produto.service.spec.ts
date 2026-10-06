import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Produto, ProdutosDaMarca } from '../models/produto.model';
import { ProdutoService } from './produto.service';

describe('ProdutoService', () => {
  const produto: Produto = { id: 'p1', nome: 'Sabonete', codigo: null, criadoEm: '2026-01-01T12:00:00Z' };
  const dados = { nome: 'Sabonete', codigo: '' };
  let service: ProdutoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ProdutoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar faz GET em /marcas/{marcaId}/produtos', () => {
    const resposta: ProdutosDaMarca = { produtos: [produto], limite: 10 };
    let recebido: ProdutosDaMarca | undefined;
    service.listar('m1').subscribe((valor) => (recebido = valor));

    const requisicao = http.expectOne('/api/v1/marcas/m1/produtos');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(resposta);

    expect(recebido).toEqual(resposta);
  });

  it('buscar faz GET em /marcas/{marcaId}/produtos/{id}', () => {
    service.buscar('m1', 'p1').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/produtos/p1');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(produto);
  });

  it('criar faz POST com os dados', () => {
    service.criar('m1', dados).subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/produtos');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual(dados);
    requisicao.flush(produto);
  });

  it('atualizar faz PUT com os dados', () => {
    service.atualizar('m1', 'p1', dados).subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/produtos/p1');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual(dados);
    requisicao.flush(produto);
  });

  it('excluir faz DELETE', () => {
    service.excluir('m1', 'p1').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/produtos/p1');
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('codifica os ids na URL', () => {
    service.buscar('a/b', 'c d').subscribe();

    http.expectOne('/api/v1/marcas/a%2Fb/produtos/c%20d').flush(produto);
  });
});

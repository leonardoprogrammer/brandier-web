import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Marca, MinhasMarcas } from '../models/marca.model';
import { MarcaService } from './marca.service';

describe('MarcaService', () => {
  const marca: Marca = { id: 'abc', nome: 'Alfa', descricao: null, criadoEm: '2026-01-01T12:00:00Z' };
  let service: MarcaService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MarcaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar faz GET em /marcas', () => {
    const resposta: MinhasMarcas = { marcas: [marca], limite: 2 };
    let recebido: MinhasMarcas | undefined;
    service.listar().subscribe((valor) => (recebido = valor));

    const requisicao = http.expectOne('/api/v1/marcas');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(resposta);

    expect(recebido).toEqual(resposta);
  });

  it('buscar faz GET em /marcas/{id}', () => {
    service.buscar('abc').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/abc');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(marca);
  });

  it('criar faz POST em /marcas com os dados', () => {
    service.criar({ nome: 'Alfa', descricao: 'Texto' }).subscribe();

    const requisicao = http.expectOne('/api/v1/marcas');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual({ nome: 'Alfa', descricao: 'Texto' });
    requisicao.flush(marca);
  });

  it('atualizar faz PUT em /marcas/{id} com os dados', () => {
    service.atualizar('abc', { nome: 'Novo', descricao: '' }).subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/abc');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual({ nome: 'Novo', descricao: '' });
    requisicao.flush(marca);
  });

  it('excluir faz DELETE em /marcas/{id}', () => {
    service.excluir('abc').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/abc');
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('codifica o id na URL', () => {
    service.buscar('a/b c').subscribe();

    http.expectOne('/api/v1/marcas/a%2Fb%20c').flush(marca);
  });
});

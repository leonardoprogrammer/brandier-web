import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { DadosReposicao, Pagina, Reposicao } from '../models/reposicao.model';
import { ReposicaoService } from './reposicao.service';

describe('ReposicaoService', () => {
  const reposicao: Reposicao = {
    id: 'r1',
    marcaId: 'm1',
    marcaNome: 'Alfa',
    lojaId: 'l1',
    lojaNome: 'Centro',
    autorNome: 'Ana',
    repostoEm: '2026-03-10T12:00:00Z',
    observacoes: null,
    itens: [{ produtoId: 'p1', produtoNome: 'Sabonete', quantidade: 10 }],
    totalUnidades: 10,
    criadoEm: '2026-03-10T12:05:00Z',
    podeEditar: true,
    editavelAte: '2026-03-11T12:05:00Z',
  };
  const dados: DadosReposicao = {
    lojaId: 'l1',
    repostoEm: '2026-03-10T12:00:00.000Z',
    itens: [{ produtoId: 'p1', quantidade: 10 }],
    observacoes: '',
  };
  let service: ReposicaoService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReposicaoService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listarMinhas faz GET em /reposicoes com a paginação', () => {
    const resposta: Pagina<Reposicao> = { conteudo: [reposicao], pagina: 1, tamanho: 10, totalElementos: 11, totalPaginas: 2 };
    let recebido: Pagina<Reposicao> | undefined;
    service.listarMinhas(1, 10).subscribe((valor) => (recebido = valor));

    const requisicao = http.expectOne((r) => r.url === '/api/v1/reposicoes');
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('pagina')).toBe('1');
    expect(requisicao.request.params.get('tamanho')).toBe('10');
    requisicao.flush(resposta);

    expect(recebido).toEqual(resposta);
  });

  it('listarDaMarca faz GET em /marcas/{marcaId}/reposicoes com a paginação', () => {
    service.listarDaMarca('m1', 0, 20).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/v1/marcas/m1/reposicoes');
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('pagina')).toBe('0');
    expect(requisicao.request.params.get('tamanho')).toBe('20');
    requisicao.flush({ conteudo: [], pagina: 0, tamanho: 20, totalElementos: 0, totalPaginas: 0 });
  });

  it('buscar faz GET em /marcas/{marcaId}/reposicoes/{id}', () => {
    service.buscar('m1', 'r1').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/reposicoes/r1');
    expect(requisicao.request.method).toBe('GET');
    requisicao.flush(reposicao);
  });

  it('criar faz POST com os dados', () => {
    service.criar('m1', dados).subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/reposicoes');
    expect(requisicao.request.method).toBe('POST');
    expect(requisicao.request.body).toEqual(dados);
    requisicao.flush(reposicao);
  });

  it('atualizar faz PUT com os dados', () => {
    service.atualizar('m1', 'r1', dados).subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/reposicoes/r1');
    expect(requisicao.request.method).toBe('PUT');
    expect(requisicao.request.body).toEqual(dados);
    requisicao.flush(reposicao);
  });

  it('excluir faz DELETE', () => {
    service.excluir('m1', 'r1').subscribe();

    const requisicao = http.expectOne('/api/v1/marcas/m1/reposicoes/r1');
    expect(requisicao.request.method).toBe('DELETE');
    requisicao.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('codifica os ids na URL', () => {
    service.buscar('a/b', 'c d').subscribe();

    http.expectOne('/api/v1/marcas/a%2Fb/reposicoes/c%20d').flush(reposicao);
  });
});

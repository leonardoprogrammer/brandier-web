import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { FiltroDoRelatorio } from '../models/reposicao.model';
import { RelatorioService } from './relatorio.service';

describe('RelatorioService', () => {
  const filtroVazio: FiltroDoRelatorio = { lojaId: '', autorId: '', produtoId: '', de: null, ate: null, ordenar: 'data', direcao: 'desc' };
  const filtroCompleto: FiltroDoRelatorio = {
    lojaId: 'l1',
    autorId: 'u1',
    produtoId: 'p1',
    de: '2026-02-01T03:00:00.000Z',
    ate: '2026-03-01T03:00:00.000Z',
    ordenar: 'loja',
    direcao: 'asc',
  };
  let service: RelatorioService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RelatorioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consultar envia só a ordenação e a paginação quando não há filtros', () => {
    service.consultar('m1', filtroVazio, 0, 20).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/v1/marcas/m1/relatorios/reposicoes');
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.keys().sort()).toEqual(['direcao', 'ordenar', 'pagina', 'tamanho']);
    expect(requisicao.request.params.get('ordenar')).toBe('data');
    expect(requisicao.request.params.get('direcao')).toBe('desc');
    expect(requisicao.request.params.get('pagina')).toBe('0');
    expect(requisicao.request.params.get('tamanho')).toBe('20');
    requisicao.flush({ conteudo: [], pagina: 0, tamanho: 20, totalElementos: 0, totalPaginas: 0, totais: { reposicoes: 0, unidades: 0 } });
  });

  it('consultar envia todos os filtros informados', () => {
    service.consultar('m1', filtroCompleto, 2, 50).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/v1/marcas/m1/relatorios/reposicoes');
    const parametros = requisicao.request.params;
    expect(parametros.get('lojaId')).toBe('l1');
    expect(parametros.get('autorId')).toBe('u1');
    expect(parametros.get('produtoId')).toBe('p1');
    expect(parametros.get('de')).toBe(filtroCompleto.de!);
    expect(parametros.get('ate')).toBe(filtroCompleto.ate!);
    expect(parametros.get('ordenar')).toBe('loja');
    expect(parametros.get('direcao')).toBe('asc');
    expect(parametros.get('pagina')).toBe('2');
    requisicao.flush({});
  });

  it('consultar codifica o id da marca na URL', () => {
    service.consultar('a/b', filtroVazio, 0, 20).subscribe();

    http.expectOne((r) => r.url === '/api/v1/marcas/a%2Fb/relatorios/reposicoes').flush({});
  });

  it('urlDoCsv aponta para o endpoint de exportação com os filtros e sem paginação', () => {
    const url = service.urlDoCsv('m1', filtroCompleto);

    expect(url.startsWith('/api/v1/marcas/m1/relatorios/reposicoes/csv?')).toBeTrue();
    expect(url).toContain('lojaId=l1');
    expect(url).toContain('autorId=u1');
    expect(url).toContain('produtoId=p1');
    expect(url).toContain('ordenar=loja');
    expect(url).toContain('direcao=asc');
    expect(url).not.toContain('pagina');
    expect(url).not.toContain('tamanho');
  });

  it('urlDoCsv codifica caracteres especiais das datas', () => {
    const url = service.urlDoCsv('m1', { ...filtroVazio, de: '2026-02-01T03:00:00.000+00:00' });

    expect(url).toContain('de=2026-02-01T03:00:00.000%2B00:00');
  });

  it('urlDoCsv omite filtros vazios', () => {
    const url = service.urlDoCsv('m1', filtroVazio);

    expect(url).toBe('/api/v1/marcas/m1/relatorios/reposicoes/csv?ordenar=data&direcao=desc');
  });
});

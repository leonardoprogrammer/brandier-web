import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Periodo } from '../models/painel.model';
import { PainelService } from './painel.service';

describe('PainelService', () => {
  const periodo: Periodo = { de: '2026-02-01T03:00:00.000Z', ate: '2026-03-01T03:00:00.000Z' };
  let service: PainelService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PainelService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gestor faz GET em /painel/gestor com o período', () => {
    service.gestor(periodo).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/v1/painel/gestor');
    expect(requisicao.request.method).toBe('GET');
    expect(requisicao.request.params.get('de')).toBe(periodo.de);
    expect(requisicao.request.params.get('ate')).toBe(periodo.ate);
    requisicao.flush({ periodo, marcas: [], limiteMarcas: 2 });
  });

  it('minhasReposicoes faz GET em /painel/minhas-reposicoes com o período', () => {
    service.minhasReposicoes(periodo).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/v1/painel/minhas-reposicoes');
    expect(requisicao.request.params.get('de')).toBe(periodo.de);
    requisicao.flush({});
  });

  it('marca faz GET em /marcas/{id}/painel com o período e codifica o id', () => {
    service.marca('a/b', periodo).subscribe();

    const requisicao = http.expectOne((r) => r.url === '/api/v1/marcas/a%2Fb/painel');
    expect(requisicao.request.params.get('ate')).toBe(periodo.ate);
    requisicao.flush({});
  });
});

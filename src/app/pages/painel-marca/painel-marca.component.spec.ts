import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { PainelMarca } from '../../models/painel.model';
import { PainelService } from '../../services/painel.service';
import { PainelMarcaComponent } from './painel-marca.component';

describe('PainelMarcaComponent', () => {
  const periodo = { de: '2026-02-01T03:00:00.000Z', ate: '2026-03-01T03:00:00.000Z' };
  const painel: PainelMarca = {
    periodo,
    marcaId: 'm1',
    marcaNome: 'Alfa',
    totais: { reposicoes: 5, unidades: 120 },
    porLoja: [{ id: 'l1', nome: 'Centro', reposicoes: 3, unidades: 80 }],
    porPromotor: [{ id: 'u1', nome: 'Ana', reposicoes: 5, unidades: 120 }],
    porProduto: [{ id: 'p1', nome: 'Sabonete', reposicoes: 5, unidades: 120 }],
    promotoresSemAtividade: [{ id: 'pr1', usuarioId: 'u2', nome: 'Bia', email: 'bia@exemplo.com', entrouEm: '2026-01-15T12:00:00Z' }],
    uso: { lojas: 2, limiteLojas: 5, produtos: 3, limiteProdutos: 10, promotores: 2, limitePromotores: 5 },
  };
  let fixture: ComponentFixture<PainelMarcaComponent>;
  let painelService: jasmine.SpyObj<PainelService>;

  beforeEach(async () => {
    painelService = jasmine.createSpyObj<PainelService>('PainelService', ['gestor', 'minhasReposicoes', 'marca']);
    await TestBed.configureTestingModule({
      imports: [PainelMarcaComponent],
      providers: [
        provideRouter([]),
        { provide: PainelService, useValue: painelService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ marcaId: 'm1' }) } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PainelMarcaComponent);
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const texto = (seletor: string): string | undefined => elemento().querySelector(seletor)?.textContent?.replace(/\s+/g, ' ').trim();

  it('mostra o carregamento enquanto busca', () => {
    painelService.marca.and.returnValue(new Subject<PainelMarca>());
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Carregando...');
  });

  it('consulta o painel da marca da rota nos últimos 7 dias', () => {
    painelService.marca.and.returnValue(of(painel));
    fixture.detectChanges();

    const [marcaId, consulta] = painelService.marca.calls.mostRecent().args;
    expect(marcaId).toBe('m1');
    expect(Math.round((new Date(consulta.ate).getTime() - new Date(consulta.de).getTime()) / 86_400_000)).toBe(7);
  });

  it('mostra totais, os três rankings, o uso dos limites e os promotores sem atividade', () => {
    painelService.marca.and.returnValue(of(painel));
    fixture.detectChanges();

    expect(elemento().querySelector('h1')?.textContent).toContain('Painel de Alfa');
    expect(texto('[data-testid="total-reposicoes"]')).toBe('5');
    expect(texto('[data-testid="total-unidades"]')).toBe('120');
    expect(elemento().querySelectorAll('app-ranking').length).toBe(3);
    expect(elemento().textContent).toContain('Por promotor');
    expect(texto('[data-testid="uso"]')).toBe('Lojas: 2/5Produtos ativos: 3/10Promotores: 2/5');
    expect(texto('[data-testid="promotor-inativo"]')).toContain('Bia');
    expect(texto('[data-testid="promotor-inativo"]')).toContain('bia@exemplo.com');
  });

  it('diz que todos atuaram quando não há promotores inativos', () => {
    painelService.marca.and.returnValue(of({ ...painel, promotoresSemAtividade: [] }));
    fixture.detectChanges();

    expect(texto('[data-testid="sem-atividade-vazio"]')).toContain('Todos os promotores registraram reposições no período.');
  });

  it('diz que a marca não tem promotores quando não há nenhum', () => {
    painelService.marca.and.returnValue(of({ ...painel, promotoresSemAtividade: [], uso: { ...painel.uso, promotores: 0 } }));
    fixture.detectChanges();

    expect(texto('[data-testid="sem-atividade-vazio"]')).toContain('Esta marca ainda não tem promotores.');
  });

  it('tem atalhos para reposições e promotores da marca', () => {
    painelService.marca.and.returnValue(of(painel));
    fixture.detectChanges();

    expect(elemento().querySelector('a[href="/painel/marcas/m1/reposicoes"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/painel/marcas/m1/promotores"]')).not.toBeNull();
  });

  it('recarrega ao mudar o período', () => {
    painelService.marca.and.returnValue(of(painel));
    fixture.detectChanges();

    Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === '90 dias')!.click();
    fixture.detectChanges();

    expect(painelService.marca).toHaveBeenCalledTimes(2);
    const [, consulta] = painelService.marca.calls.mostRecent().args;
    expect(Math.round((new Date(consulta.ate).getTime() - new Date(consulta.de).getTime()) / 86_400_000)).toBe(90);
  });

  it('mostra marca não encontrada quando a API responde 404', () => {
    painelService.marca.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO' } })));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Marca não encontrada.');
  });

  it('mostra erro e permite tentar de novo quando a consulta falha', () => {
    painelService.marca.and.returnValues(throwError(() => new Error('falha')), of(painel));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar o painel da marca');

    (elemento().querySelector('[role="alert"] button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(painelService.marca).toHaveBeenCalledTimes(2);
    expect(texto('[data-testid="total-reposicoes"]')).toBe('5');
  });
});

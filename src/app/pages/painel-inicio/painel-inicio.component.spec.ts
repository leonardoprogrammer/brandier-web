import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { PainelAutor, PainelGestor } from '../../models/painel.model';
import { Reposicao } from '../../models/reposicao.model';
import { Usuario } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { ConviteService } from '../../services/convite.service';
import { PainelService } from '../../services/painel.service';
import { PainelInicioComponent } from './painel-inicio.component';

describe('PainelInicioComponent', () => {
  const periodo = { de: '2026-02-01T03:00:00.000Z', ate: '2026-03-01T03:00:00.000Z' };
  const ultima: Reposicao = {
    id: 'r1',
    marcaId: 'm1',
    marcaNome: 'Alfa',
    lojaId: 'l1',
    lojaNome: 'Centro',
    autorNome: 'Pessoa Teste',
    repostoEm: '2026-02-20T12:00:00Z',
    observacoes: null,
    itens: [{ produtoId: 'p1', produtoNome: 'Sabonete', quantidade: 5 }],
    totalUnidades: 5,
    criadoEm: '2026-02-20T12:05:00Z',
    podeEditar: true,
    editavelAte: null,
  };
  const autorComDados: PainelAutor = {
    periodo,
    totais: { reposicoes: 3, unidades: 42 },
    porMarca: [{ id: 'm1', nome: 'Alfa', reposicoes: 3, unidades: 42 }],
    porLoja: [{ id: 'l1', nome: 'Centro', reposicoes: 1, unidades: 30 }, { id: 'l2', nome: 'Norte', reposicoes: 2, unidades: 12 }],
    porProduto: [{ id: 'p1', nome: 'Sabonete', reposicoes: 3, unidades: 42 }],
    ultimas: [ultima],
  };
  const autorVazio: PainelAutor = { periodo, totais: { reposicoes: 0, unidades: 0 }, porMarca: [], porLoja: [], porProduto: [], ultimas: [] };
  const gestorComMarcas: PainelGestor = {
    periodo,
    limiteMarcas: 2,
    marcas: [
      {
        marcaId: 'm1',
        marcaNome: 'Alfa',
        totais: { reposicoes: 1, unidades: 8 },
        uso: { lojas: 2, limiteLojas: 5, produtos: 4, limiteProdutos: 10, promotores: 1, limitePromotores: 5 },
      },
    ],
  };
  const gestorSemMarcas: PainelGestor = { periodo, marcas: [], limiteMarcas: 2 };

  let fixture: ComponentFixture<PainelInicioComponent>;
  let painelService: jasmine.SpyObj<PainelService>;
  let conviteService: jasmine.SpyObj<ConviteService>;

  beforeEach(async () => {
    painelService = jasmine.createSpyObj<PainelService>('PainelService', ['gestor', 'minhasReposicoes', 'marca']);
    conviteService = jasmine.createSpyObj<ConviteService>('ConviteService', ['recebidos', 'aceitarPorId', 'recusarPorId']);
    conviteService.recebidos.and.returnValue(of({ convites: [] }));
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['sair']);
    Object.defineProperty(auth, 'usuario', {
      value: signal<Usuario | null>({ id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com' }).asReadonly(),
    });
    await TestBed.configureTestingModule({
      imports: [PainelInicioComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: PainelService, useValue: painelService },
        { provide: ConviteService, useValue: conviteService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PainelInicioComponent);
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const texto = (seletor: string): string | undefined => elemento().querySelector(seletor)?.textContent?.replace(/\s+/g, ' ').trim();

  function iniciar(autor: PainelAutor, gestor: PainelGestor): void {
    painelService.minhasReposicoes.and.returnValue(of(autor));
    painelService.gestor.and.returnValue(of(gestor));
    fixture.detectChanges();
  }

  it('cumprimenta o usuário pelo nome e oferece registrar reposição', () => {
    iniciar(autorVazio, gestorSemMarcas);

    expect(elemento().querySelector('h1')?.textContent).toContain('Olá, Pessoa Teste!');
    expect(elemento().querySelector('header a, div a[href="/painel/reposicoes/nova"]')).not.toBeNull();
  });

  it('consulta as duas visões com o período dos últimos 30 dias', () => {
    iniciar(autorVazio, gestorSemMarcas);

    const [periodoDoAutor] = painelService.minhasReposicoes.calls.mostRecent().args;
    const dias = (new Date(periodoDoAutor.ate).getTime() - new Date(periodoDoAutor.de).getTime()) / 86_400_000;
    expect(Math.round(dias)).toBe(30);
    expect(painelService.gestor).toHaveBeenCalledWith(periodoDoAutor);
  });

  it('mostra o carregamento de cada visão enquanto busca', () => {
    painelService.minhasReposicoes.and.returnValue(new Subject<PainelAutor>());
    painelService.gestor.and.returnValue(new Subject<PainelGestor>());
    fixture.detectChanges();

    expect(elemento().querySelector('[data-testid="carregando-autor"]')).not.toBeNull();
    expect(elemento().querySelector('[data-testid="carregando-gestor"]')).not.toBeNull();
  });

  describe('minhas reposições', () => {
    it('mostra totais, rankings e as últimas reposições', () => {
      iniciar(autorComDados, gestorSemMarcas);

      expect(texto('[data-testid="total-reposicoes"]')).toBe('3');
      expect(texto('[data-testid="total-unidades"]')).toBe('42');
      expect(elemento().querySelectorAll('app-ranking').length).toBe(3);
      expect(elemento().textContent).toContain('Por marca');
      expect(elemento().textContent).toContain('Norte');
      expect(texto('[data-testid="ultima"]')).toContain('Centro · Alfa');
      expect(texto('[data-testid="ultima"]')).toContain('5 un.');
    });

    it('mostra o estado vazio quando não há reposições no período', () => {
      iniciar(autorVazio, gestorSemMarcas);

      expect(elemento().querySelector('[data-testid="autor-vazio"]')?.textContent).toContain('não registrou reposições neste período');
      expect(elemento().querySelectorAll('app-ranking').length).toBe(0);
    });

    it('mostra erro e permite tentar de novo só nesta visão', () => {
      painelService.minhasReposicoes.and.returnValues(throwError(() => new Error('falha')), of(autorComDados));
      painelService.gestor.and.returnValue(of(gestorSemMarcas));
      fixture.detectChanges();

      expect(elemento().querySelector('[data-testid="erro-autor"]')?.textContent).toContain('Não foi possível carregar as suas reposições');
      expect(elemento().querySelector('[data-testid="erro-gestor"]')).toBeNull();

      (elemento().querySelector('[data-testid="erro-autor"] button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(painelService.minhasReposicoes).toHaveBeenCalledTimes(2);
      expect(painelService.gestor).toHaveBeenCalledTimes(1);
      expect(texto('[data-testid="total-reposicoes"]')).toBe('3');
    });
  });

  describe('minhas marcas', () => {
    it('mostra o uso do limite de marcas e um cartão por marca com totais, uso e atalhos', () => {
      iniciar(autorVazio, gestorComMarcas);

      expect(texto('[data-testid="uso-marcas"]')).toBe('1/2 marcas');
      const cartao = texto('[data-testid="marca"]');
      expect(cartao).toContain('Alfa');
      expect(cartao).toContain('1 reposição');
      expect(cartao).toContain('8 un. no período');
      expect(texto('[data-testid="uso-da-marca"]')).toBe('Lojas 2/5 · Produtos 4/10 · Promotores 1/5');
      expect(elemento().querySelector('a[href="/painel/marcas/m1/resumo"]')).not.toBeNull();
      expect(elemento().querySelector('a[href="/painel/marcas/m1/reposicoes"]')).not.toBeNull();
    });

    it('incentiva criar a primeira marca quando não há nenhuma', () => {
      iniciar(autorVazio, gestorSemMarcas);

      expect(texto('[data-testid="uso-marcas"]')).toBe('0/2 marcas');
      expect(elemento().querySelector('[data-testid="gestor-vazio"]')?.textContent).toContain('Você ainda não criou nenhuma marca.');
      expect(elemento().querySelector('a[href="/painel/marcas/nova"]')).not.toBeNull();
    });

    it('mostra erro e permite tentar de novo só nesta visão', () => {
      painelService.minhasReposicoes.and.returnValue(of(autorVazio));
      painelService.gestor.and.returnValues(throwError(() => new Error('falha')), of(gestorComMarcas));
      fixture.detectChanges();

      expect(elemento().querySelector('[data-testid="erro-gestor"]')?.textContent).toContain('Não foi possível carregar as suas marcas');

      (elemento().querySelector('[data-testid="erro-gestor"] button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(painelService.gestor).toHaveBeenCalledTimes(2);
      expect(painelService.minhasReposicoes).toHaveBeenCalledTimes(1);
      expect(elemento().querySelector('[data-testid="marca"]')).not.toBeNull();
    });
  });

  it('mostra os convites pendentes no topo do painel', () => {
    conviteService.recebidos.and.returnValue(
      of({ convites: [{ id: 'c1', marcaNome: 'Gama', gestorNome: 'Gestor', expiraEm: '2026-03-08T12:00:00Z', criadoEm: '2026-03-01T12:00:00Z' }] }),
    );
    iniciar(autorVazio, gestorSemMarcas);

    expect(elemento().querySelector('[data-testid="convite-recebido"]')?.textContent).toContain('Gama');
  });

  it('não mostra a área de convites quando não há nenhum', () => {
    iniciar(autorVazio, gestorSemMarcas);

    expect(elemento().querySelector('app-convites-recebidos section')).toBeNull();
  });

  it('recarrega as duas visões ao mudar o período', () => {
    iniciar(autorVazio, gestorSemMarcas);

    const botao7 = Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === '7 dias')!;
    botao7.click();
    fixture.detectChanges();

    expect(painelService.minhasReposicoes).toHaveBeenCalledTimes(2);
    expect(painelService.gestor).toHaveBeenCalledTimes(2);
    const [novo] = painelService.gestor.calls.mostRecent().args;
    expect(Math.round((new Date(novo.ate).getTime() - new Date(novo.de).getTime()) / 86_400_000)).toBe(7);
  });
});

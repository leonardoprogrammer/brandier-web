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
    possuiReposicoes: true,
    marcasComoPromotor: 0,
    totais: { reposicoes: 3, unidades: 42 },
    porMarca: [{ id: 'm1', nome: 'Alfa', reposicoes: 3, unidades: 42 }],
    porLoja: [{ id: 'l1', nome: 'Centro', reposicoes: 1, unidades: 30 }, { id: 'l2', nome: 'Norte', reposicoes: 2, unidades: 12 }],
    porProduto: [{ id: 'p1', nome: 'Sabonete', reposicoes: 3, unidades: 42 }],
    ultimas: [ultima],
  };
  const autorSoNoPassado: PainelAutor = { ...autorComDados, totais: { reposicoes: 0, unidades: 0 }, porMarca: [], porLoja: [], porProduto: [] };
  const autorNunca: PainelAutor = {
    periodo,
    possuiReposicoes: false,
    marcasComoPromotor: 0,
    totais: { reposicoes: 0, unidades: 0 },
    porMarca: [],
    porLoja: [],
    porProduto: [],
    ultimas: [],
  };
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
      value: signal<Usuario | null>({ id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com', temSenha: true, termosAceitos: true }).asReadonly(),
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
  const existe = (seletor: string): boolean => elemento().querySelector(seletor) !== null;
  const texto = (seletor: string): string | undefined => elemento().querySelector(seletor)?.textContent?.replace(/\s+/g, ' ').trim();
  const botao = (rotulo: string): HTMLButtonElement =>
    Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === rotulo)!;

  function iniciar(autor: PainelAutor, gestor: PainelGestor): void {
    painelService.minhasReposicoes.and.returnValue(of(autor));
    painelService.gestor.and.returnValue(of(gestor));
    fixture.detectChanges();
  }

  it('cumprimenta o usuário pelo nome', () => {
    iniciar(autorComDados, gestorComMarcas);

    expect(elemento().querySelector('h1')?.textContent).toContain('Olá, Pessoa Teste!');
  });

  it('consulta as duas visões com o período dos últimos 7 dias', () => {
    iniciar(autorComDados, gestorComMarcas);

    const [periodoDoAutor] = painelService.minhasReposicoes.calls.mostRecent().args;
    const dias = (new Date(periodoDoAutor.ate).getTime() - new Date(periodoDoAutor.de).getTime()) / 86_400_000;
    expect(Math.round(dias)).toBe(7);
    expect(painelService.gestor).toHaveBeenCalledWith(periodoDoAutor);
  });

  it('mostra só o carregamento enquanto ainda não sabe o que exibir', () => {
    painelService.minhasReposicoes.and.returnValue(new Subject<PainelAutor>());
    painelService.gestor.and.returnValue(new Subject<PainelGestor>());
    fixture.detectChanges();

    expect(existe('[data-testid="carregando"]')).toBeTrue();
    expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
    expect(existe('#titulo-minhas-reposicoes')).toBeFalse();
    expect(existe('#titulo-minhas-marcas')).toBeFalse();
  });

  it('não decide nada até as duas consultas responderem', () => {
    painelService.minhasReposicoes.and.returnValue(of(autorNunca));
    painelService.gestor.and.returnValue(new Subject<PainelGestor>());
    fixture.detectChanges();

    expect(existe('[data-testid="carregando"]')).toBeTrue();
    expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
  });

  describe('quem não tem marca nem reposição', () => {
    beforeEach(() => iniciar(autorNunca, gestorSemMarcas));

    it('mostra a mensagem com os caminhos para começar', () => {
      expect(texto('[data-testid="inicio-vazio"]')).toContain('Você ainda não tem marcas nem reposições');
      expect(elemento().querySelector('[data-testid="inicio-vazio"] a[href="/painel/marcas/nova"]')).not.toBeNull();
      expect(elemento().querySelector('[data-testid="inicio-vazio"] a[href="/painel/promotor"]')).not.toBeNull();
    });

    it('não mostra as seções, o seletor de período nem o botão de nova reposição', () => {
      expect(existe('#titulo-minhas-reposicoes')).toBeFalse();
      expect(existe('#titulo-minhas-marcas')).toBeFalse();
      expect(existe('app-seletor-periodo')).toBeFalse();
      expect(existe('header a[href="/painel/reposicoes/nova"], div > a[href="/painel/reposicoes/nova"]')).toBeFalse();
    });
  });

  describe('quem é só promotor e ainda não registrou reposição', () => {
    const promotorNovato: PainelAutor = { ...autorNunca, marcasComoPromotor: 1 };

    beforeEach(() => iniciar(promotorNovato, gestorSemMarcas));

    it('instrui a registrar a primeira reposição, sem a mensagem de quem não tem nada', () => {
      expect(texto('[data-testid="inicio-promotor"]')).toContain('Registre a sua primeira reposição');
      expect(texto('[data-testid="inicio-promotor"]')).toContain('Você já é promotor de uma marca');
      expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
    });

    it('com uma só marca diz "Você já é promotor de uma marca"', () => {
      expect(texto('[data-testid="inicio-promotor"] p')).toContain('Você já é promotor de uma marca, mas ainda não registrou nenhuma reposição.');
      expect(texto('[data-testid="inicio-promotor"] p')).not.toContain('marcas, mas');
    });

    it('com mais de uma marca diz "Você já é promotor de N marcas"', () => {
      for (const quantidade of [2, 3, 5]) {
        painelService.minhasReposicoes.and.returnValue(of({ ...promotorNovato, marcasComoPromotor: quantidade }));
        fixture = TestBed.createComponent(PainelInicioComponent);
        fixture.detectChanges();

        expect(texto('[data-testid="inicio-promotor"] p')).toContain(`Você já é promotor de ${quantidade} marcas, mas ainda não registrou nenhuma reposição.`);
      }
    });

    it('oferece o botão para registrar e o caminho para as marcas como promotor', () => {
      expect(elemento().querySelector('[data-testid="inicio-promotor"] a[href="/painel/reposicoes/nova"]')?.textContent).toContain('Registrar reposição');
      expect(elemento().querySelector('[data-testid="inicio-promotor"] a[href="/painel/promotor"]')).not.toBeNull();
    });

    it('não repete o botão do topo, nem mostra seções ou seletor de período', () => {
      expect(elemento().querySelectorAll('a[href="/painel/reposicoes/nova"]').length).toBe(1);
      expect(existe('#titulo-minhas-reposicoes')).toBeFalse();
      expect(existe('#titulo-minhas-marcas')).toBeFalse();
      expect(existe('app-seletor-periodo')).toBeFalse();
    });

  });

  describe('promotor que já registrou reposição', () => {
    it('mostra Minhas reposições normalmente, sem a instrução de primeira reposição', () => {
      iniciar({ ...autorComDados, marcasComoPromotor: 1 }, gestorSemMarcas);

      expect(existe('#titulo-minhas-reposicoes')).toBeTrue();
      expect(existe('[data-testid="inicio-promotor"]')).toBeFalse();
      expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
    });
  });

  describe('gestor que também é promotor', () => {
    it('com marca criada mostra Minhas marcas e não a instrução de promotor', () => {
      iniciar({ ...autorNunca, marcasComoPromotor: 1 }, gestorComMarcas);

      expect(existe('#titulo-minhas-marcas')).toBeTrue();
      expect(existe('[data-testid="inicio-promotor"]')).toBeFalse();
      expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
    });
  });

  describe('só "Minhas reposições" (promotor sem marcas)', () => {
    beforeEach(() => iniciar(autorComDados, gestorSemMarcas));

    it('mostra Minhas reposições e esconde Minhas marcas e a mensagem de vazio', () => {
      expect(existe('#titulo-minhas-reposicoes')).toBeTrue();
      expect(existe('#titulo-minhas-marcas')).toBeFalse();
      expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
      expect(existe('[data-testid="uso-marcas"]')).toBeFalse();
    });

    it('mostra totais, rankings e as últimas reposições', () => {
      expect(texto('[data-testid="total-reposicoes"]')).toBe('3');
      expect(texto('[data-testid="total-unidades"]')).toBe('42');
      expect(elemento().querySelectorAll('app-ranking').length).toBe(3);
      expect(elemento().textContent).toContain('Por marca');
      expect(elemento().textContent).toContain('Norte');
      expect(texto('[data-testid="ultima"]')).toContain('Centro · Alfa');
      expect(texto('[data-testid="ultima"]')).toContain('5 un.');
    });

    it('mantém o seletor de período e o botão de nova reposição', () => {
      expect(existe('app-seletor-periodo')).toBeTrue();
      expect(existe('a[href="/painel/reposicoes/nova"]')).toBeTrue();
    });
  });

  describe('só "Minhas marcas" (gestor que nunca repôs)', () => {
    beforeEach(() => iniciar(autorNunca, gestorComMarcas));

    it('mostra Minhas marcas e esconde Minhas reposições e a mensagem de vazio', () => {
      expect(existe('#titulo-minhas-marcas')).toBeTrue();
      expect(existe('#titulo-minhas-reposicoes')).toBeFalse();
      expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
    });

    it('mostra o uso do limite de marcas e um cartão por marca com totais, uso e atalhos', () => {
      expect(texto('[data-testid="uso-marcas"]')).toBe('1/2 marcas');
      const cartao = texto('[data-testid="marca"]');
      expect(cartao).toContain('Alfa');
      expect(cartao).toContain('1 reposição');
      expect(cartao).toContain('8 un. no período');
      expect(texto('[data-testid="uso-da-marca"]')).toBe('Lojas 2/5 · Produtos 4/10 · Promotores 1/5');
      expect(elemento().querySelector('a[href="/painel/marcas/m1/resumo"]')).not.toBeNull();
      expect(elemento().querySelector('a[href="/painel/marcas/m1/reposicoes"]')).not.toBeNull();
    });

    it('mantém o seletor de período', () => {
      expect(existe('app-seletor-periodo')).toBeTrue();
    });
  });

  describe('as duas visões', () => {
    it('mostra Minhas reposições e Minhas marcas quando há as duas coisas', () => {
      iniciar(autorComDados, gestorComMarcas);

      expect(existe('#titulo-minhas-reposicoes')).toBeTrue();
      expect(existe('#titulo-minhas-marcas')).toBeTrue();
      expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
    });

    it('já registrou reposição em outra data: mostra a seção com o aviso de período sem registros', () => {
      iniciar(autorSoNoPassado, gestorSemMarcas);

      expect(existe('#titulo-minhas-reposicoes')).toBeTrue();
      expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
      expect(texto('[data-testid="total-reposicoes"]')).toBe('0');
      expect(texto('[data-testid="autor-vazio"]')).toContain('não registrou reposições neste período');
      expect(elemento().querySelectorAll('app-ranking').length).toBe(0);
    });
  });

  describe('falhas', () => {
    it('mostra o erro de Minhas reposições e permite tentar de novo só nela', () => {
      painelService.minhasReposicoes.and.returnValues(throwError(() => new Error('falha')), of(autorComDados));
      painelService.gestor.and.returnValue(of(gestorComMarcas));
      fixture.detectChanges();

      expect(texto('[data-testid="erro-autor"]')).toContain('Não foi possível carregar as suas reposições');
      expect(existe('[data-testid="erro-gestor"]')).toBeFalse();
      expect(existe('#titulo-minhas-marcas')).toBeTrue();

      (elemento().querySelector('[data-testid="erro-autor"] button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(painelService.minhasReposicoes).toHaveBeenCalledTimes(2);
      expect(painelService.gestor).toHaveBeenCalledTimes(1);
      expect(texto('[data-testid="total-reposicoes"]')).toBe('3');
    });

    it('mostra o erro de Minhas marcas e permite tentar de novo só nela', () => {
      painelService.minhasReposicoes.and.returnValue(of(autorComDados));
      painelService.gestor.and.returnValues(throwError(() => new Error('falha')), of(gestorComMarcas));
      fixture.detectChanges();

      expect(texto('[data-testid="erro-gestor"]')).toContain('Não foi possível carregar as suas marcas');
      expect(existe('[data-testid="erro-autor"]')).toBeFalse();

      (elemento().querySelector('[data-testid="erro-gestor"] button') as HTMLButtonElement).click();
      fixture.detectChanges();

      expect(painelService.gestor).toHaveBeenCalledTimes(2);
      expect(painelService.minhasReposicoes).toHaveBeenCalledTimes(1);
      expect(existe('[data-testid="marca"]')).toBeTrue();
    });

    it('não mostra a mensagem de vazio quando uma das consultas falhou', () => {
      painelService.minhasReposicoes.and.returnValue(throwError(() => new Error('falha')));
      painelService.gestor.and.returnValue(of(gestorSemMarcas));
      fixture.detectChanges();

      expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
      expect(existe('[data-testid="erro-autor"]')).toBeTrue();
    });

    it('mostra os dois erros quando as duas consultas falham', () => {
      painelService.minhasReposicoes.and.returnValue(throwError(() => new Error('falha')));
      painelService.gestor.and.returnValue(throwError(() => new Error('falha')));
      fixture.detectChanges();

      expect(existe('[data-testid="erro-autor"]')).toBeTrue();
      expect(existe('[data-testid="erro-gestor"]')).toBeTrue();
      expect(existe('[data-testid="inicio-vazio"]')).toBeFalse();
    });
  });

  it('mostra os convites pendentes no topo, inclusive para quem ainda não tem nada', () => {
    conviteService.recebidos.and.returnValue(
      of({ convites: [{ id: 'c1', marcaNome: 'Gama', gestorNome: 'Gestor', expiraEm: '2026-03-08T12:00:00Z', criadoEm: '2026-03-01T12:00:00Z' }] }),
    );
    iniciar(autorNunca, gestorSemMarcas);

    expect(elemento().querySelector('[data-testid="convite-recebido"]')?.textContent).toContain('Gama');
    expect(existe('[data-testid="inicio-vazio"]')).toBeTrue();
  });

  it('não mostra a área de convites quando não há nenhum', () => {
    iniciar(autorComDados, gestorComMarcas);

    expect(elemento().querySelector('app-convites-recebidos section')).toBeNull();
  });

  it('recarrega as duas visões ao mudar o período, mantendo o que já estava na tela', () => {
    iniciar(autorComDados, gestorComMarcas);
    painelService.minhasReposicoes.and.returnValue(new Subject<PainelAutor>());

    botao('30 dias').click();
    fixture.detectChanges();

    expect(painelService.minhasReposicoes).toHaveBeenCalledTimes(2);
    expect(painelService.gestor).toHaveBeenCalledTimes(2);
    const [novo] = painelService.gestor.calls.mostRecent().args;
    expect(Math.round((new Date(novo.ate).getTime() - new Date(novo.de).getTime()) / 86_400_000)).toBe(30);
    expect(existe('[data-testid="carregando"]')).toBeFalse();
    expect(texto('[data-testid="total-reposicoes"]')).toBe('3');
  });

  it('"Hoje" consulta apenas o dia de hoje', () => {
    iniciar(autorComDados, gestorComMarcas);

    botao('Hoje').click();
    fixture.detectChanges();

    const [hoje] = painelService.minhasReposicoes.calls.mostRecent().args;
    expect(Math.round((new Date(hoje.ate).getTime() - new Date(hoje.de).getTime()) / 86_400_000)).toBe(1);
  });
});

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { LojasDaMarca } from '../../models/loja.model';
import { MinhasMarcas } from '../../models/marca.model';
import { ProdutosDaMarca } from '../../models/produto.model';
import { MeusVinculos, PromotoresDaMarca } from '../../models/promotor.model';
import { FiltroDoRelatorio, Relatorio, Reposicao } from '../../models/reposicao.model';
import { Usuario } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { LojaService } from '../../services/loja.service';
import { MarcaService } from '../../services/marca.service';
import { ProdutoService } from '../../services/produto.service';
import { PromotorService } from '../../services/promotor.service';
import { RelatorioService } from '../../services/relatorio.service';
import { RelatoriosComponent } from './relatorios.component';

describe('RelatoriosComponent', () => {
  const lojas: LojasDaMarca = {
    lojas: [{ id: 'l1', nome: 'Centro', cidade: 'Campinas', uf: 'SP', endereco: null, criadoEm: '2026-01-01T00:00:00Z' }],
    limite: 5,
  };
  const produtos: ProdutosDaMarca = {
    produtos: [
      { id: 'p1', nome: 'Sabonete', codigo: null, cor: null, ativo: true, criadoEm: '2026-01-01T00:00:00Z' },
      { id: 'p2', nome: 'Antigo', codigo: null, cor: null, ativo: false, criadoEm: '2026-01-01T00:00:00Z' },
    ],
    limite: 10,
  };
  const promotores: PromotoresDaMarca = {
    promotores: [{ id: 'pr1', usuarioId: 'u2', nome: 'Ana', email: 'ana@exemplo.com', entrouEm: '2026-01-01T00:00:00Z' }],
    convites: [],
    usadas: 1,
    limite: 5,
  };
  const marcasGeridas: MinhasMarcas = { marcas: [{ id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' }], limite: 2 };
  const semVinculos: MeusVinculos = { vinculos: [] };
  const reposicao: Reposicao = {
    id: 'r1',
    marcaId: 'm1',
    marcaNome: 'Alfa',
    lojaId: 'l1',
    lojaNome: 'Centro',
    autorNome: 'Ana',
    repostoEm: '2026-03-10T12:00:00Z',
    observacoes: null,
    itens: [{ produtoId: 'p1', produtoNome: 'Sabonete', quantidade: 5 }],
    totalUnidades: 5,
    criadoEm: '2026-03-10T12:05:00Z',
    podeEditar: true,
    editavelAte: null,
  };
  function relatorio(conteudo: Reposicao[], total = conteudo.length, pagina = 0, totalPaginas = 1, unidades = 5): Relatorio {
    return { conteudo, pagina, tamanho: 20, totalElementos: total, totalPaginas, totais: { reposicoes: total, unidades } };
  }

  let fixture: ComponentFixture<RelatoriosComponent>;
  let relatorioService: jasmine.SpyObj<RelatorioService>;
  let marcaService: jasmine.SpyObj<MarcaService>;
  let promotorService: jasmine.SpyObj<PromotorService>;
  let lojaService: jasmine.SpyObj<LojaService>;
  let produtoService: jasmine.SpyObj<ProdutoService>;

  async function montar(consulta: Record<string, string> = {}): Promise<void> {
    relatorioService = jasmine.createSpyObj<RelatorioService>('RelatorioService', ['consultar', 'urlDoCsv']);
    marcaService = jasmine.createSpyObj<MarcaService>('MarcaService', ['listar']);
    promotorService = jasmine.createSpyObj<PromotorService>('PromotorService', ['meusVinculos', 'listar']);
    lojaService = jasmine.createSpyObj<LojaService>('LojaService', ['listar']);
    produtoService = jasmine.createSpyObj<ProdutoService>('ProdutoService', ['listar']);
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['sair']);
    Object.defineProperty(auth, 'usuario', { value: signal<Usuario | null>({ id: 'u1', nome: 'Gestora', email: 'g@exemplo.com', temSenha: true, termosAceitos: true }).asReadonly() });
    marcaService.listar.and.returnValue(of(marcasGeridas));
    promotorService.meusVinculos.and.returnValue(of(semVinculos));
    promotorService.listar.and.returnValue(of(promotores));
    lojaService.listar.and.returnValue(of(lojas));
    produtoService.listar.and.returnValue(of(produtos));
    relatorioService.consultar.and.returnValue(of(relatorio([reposicao])));
    relatorioService.urlDoCsv.and.callFake((marcaId: string) => `/csv/${marcaId}`);

    await TestBed.configureTestingModule({
      imports: [RelatoriosComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: RelatorioService, useValue: relatorioService },
        { provide: MarcaService, useValue: marcaService },
        { provide: PromotorService, useValue: promotorService },
        { provide: LojaService, useValue: lojaService },
        { provide: ProdutoService, useValue: produtoService },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(consulta) } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(RelatoriosComponent);
  }

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const campo = <T extends HTMLElement>(seletor: string): T => elemento().querySelector<T>(seletor)!;
  const texto = (seletor: string): string | undefined => elemento().querySelector(seletor)?.textContent?.replace(/\s+/g, ' ').trim();
  const botao = (rotulo: string): HTMLButtonElement =>
    Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === rotulo)!;

  function selecionar(seletor: string, valor: string): void {
    const select = campo<HTMLSelectElement>(seletor);
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function ultimoFiltro(): FiltroDoRelatorio {
    return relatorioService.consultar.calls.mostRecent().args[1];
  }

  describe('marcas', () => {
    it('com uma única marca seleciona-a, carrega os filtros e consulta os últimos 7 dias', async () => {
      await montar();
      fixture.detectChanges();

      expect(campo<HTMLSelectElement>('#filtro-marca').value).toBe('m1');
      expect(lojaService.listar).toHaveBeenCalledWith('m1');
      expect(produtoService.listar).toHaveBeenCalledWith('m1');
      expect(promotorService.listar).toHaveBeenCalledWith('m1');
      const [marcaId, filtro, pagina, tamanho] = relatorioService.consultar.calls.mostRecent().args;
      expect(marcaId).toBe('m1');
      expect(pagina).toBe(0);
      expect(tamanho).toBe(20);
      expect(filtro.ordenar).toBe('data');
      expect(filtro.direcao).toBe('desc');
      expect(Math.round((new Date(filtro.ate!).getTime() - new Date(filtro.de!).getTime()) / 86_400_000)).toBe(7);
    });

    it('junta marcas geridas e de promotor, e o gestor prevalece quando a marca está nas duas', async () => {
      await montar();
      marcaService.listar.and.returnValue(of({ marcas: [{ id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' }], limite: 2 }));
      promotorService.meusVinculos.and.returnValue(
        of({
          vinculos: [
            { marcaId: 'm1', marcaNome: 'Alfa', gestorNome: 'G', marcaAtiva: true, entrouEm: '2026-01-01T00:00:00Z' },
            { marcaId: 'm2', marcaNome: 'Beta', gestorNome: 'G', marcaAtiva: true, entrouEm: '2026-01-01T00:00:00Z' },
          ],
        } as MeusVinculos),
      );
      fixture.detectChanges();

      const nomes = Array.from(campo<HTMLSelectElement>('#filtro-marca').options).map((o) => o.textContent?.trim());
      expect(nomes).toEqual(['Selecione a marca', 'Alfa', 'Beta']);
      expect(relatorioService.consultar).not.toHaveBeenCalled();
      expect(texto('[data-testid="escolha-marca"]')).toContain('Escolha uma marca');
    });

    it('pré-seleciona a marca da URL', async () => {
      await montar({ marca: 'm2' });
      marcaService.listar.and.returnValue(of({ marcas: [{ id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' }], limite: 2 }));
      promotorService.meusVinculos.and.returnValue(
        of({ vinculos: [{ marcaId: 'm2', marcaNome: 'Beta', gestorNome: 'G', marcaAtiva: true, entrouEm: '2026-01-01T00:00:00Z' }] }),
      );
      fixture.detectChanges();

      expect(campo<HTMLSelectElement>('#filtro-marca').value).toBe('m2');
      expect(lojaService.listar).toHaveBeenCalledWith('m2');
      expect(promotorService.listar).not.toHaveBeenCalled();
    });

    it('explica quando o usuário não tem marcas', async () => {
      await montar();
      marcaService.listar.and.returnValue(of({ marcas: [], limite: 2 }));
      fixture.detectChanges();

      expect(campo('[data-testid="sem-marcas"]')).not.toBeNull();
      expect(campo('#filtro-marca')).toBeNull();
    });

    it('mostra erro e permite tentar de novo quando as marcas não carregam', async () => {
      await montar();
      marcaService.listar.and.returnValues(throwError(() => new Error('falha')), of(marcasGeridas));
      fixture.detectChanges();

      expect(campo('[role="alert"]').textContent).toContain('Não foi possível carregar as suas marcas');

      botao('Tentar de novo').click();
      fixture.detectChanges();

      expect(marcaService.listar).toHaveBeenCalledTimes(2);
      expect(campo('#filtro-marca')).not.toBeNull();
    });

    it('trocar de marca limpa filtros e resultados e recarrega o contexto', async () => {
      await montar();
      marcaService.listar.and.returnValue(of({ marcas: [{ id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' }, { id: 'm3', nome: 'Gama', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' }], limite: 2 }));
      fixture.detectChanges();
      selecionar('#filtro-marca', 'm1');
      selecionar('#filtro-loja', 'l1');
      expect(ultimoFiltro().lojaId).toBe('l1');

      selecionar('#filtro-marca', 'm3');

      expect(lojaService.listar).toHaveBeenCalledWith('m3');
      expect(ultimoFiltro().lojaId).toBe('');
    });
  });

  describe('filtros', () => {
    beforeEach(async () => {
      await montar();
      fixture.detectChanges();
    });

    it('lista lojas, promotores (com o gestor primeiro) e produtos, marcando os inativos', () => {
      const lojasNaTela = Array.from(campo<HTMLSelectElement>('#filtro-loja').options).map((o) => o.textContent?.trim());
      const autores = Array.from(campo<HTMLSelectElement>('#filtro-autor').options).map((o) => o.textContent?.trim());
      const produtosNaTela = Array.from(campo<HTMLSelectElement>('#filtro-produto').options).map((o) => o.textContent?.trim());

      expect(lojasNaTela).toEqual(['Todas', 'Centro']);
      expect(autores).toEqual(['Todos', 'Gestora (você)', 'Ana']);
      expect(produtosNaTela).toEqual(['Todos', 'Sabonete', 'Antigo (inativo)']);
    });

    it('cada filtro volta para a primeira página e consulta de novo', () => {
      selecionar('#filtro-loja', 'l1');
      expect(ultimoFiltro().lojaId).toBe('l1');
      expect(relatorioService.consultar.calls.mostRecent().args[2]).toBe(0);

      selecionar('#filtro-autor', 'u2');
      expect(ultimoFiltro().autorId).toBe('u2');

      selecionar('#filtro-produto', 'p1');
      expect(ultimoFiltro().produtoId).toBe('p1');
      expect(ultimoFiltro().lojaId).toBe('l1');
    });

    it('voltar a "Todas" remove o filtro', () => {
      selecionar('#filtro-loja', 'l1');
      selecionar('#filtro-loja', '');

      expect(ultimoFiltro().lojaId).toBe('');
    });

    it('mudar o período consulta com as novas datas', () => {
      botao('7 dias').click();
      fixture.detectChanges();

      const filtro = ultimoFiltro();
      expect(Math.round((new Date(filtro.ate!).getTime() - new Date(filtro.de!).getTime()) / 86_400_000)).toBe(7);
    });

    it('"Todo o período" consulta sem datas', () => {
      botao('Todo o período').click();
      fixture.detectChanges();

      expect(ultimoFiltro().de).toBeNull();
      expect(ultimoFiltro().ate).toBeNull();
    });

    it('mostra erro e permite tentar de novo quando os filtros da marca não carregam', async () => {
      TestBed.resetTestingModule();
      await montar();
      lojaService.listar.and.returnValues(throwError(() => new Error('falha')), of(lojas));
      fixture.detectChanges();

      expect(campo('[data-testid="erro-contexto"]').textContent).toContain('Não foi possível carregar os filtros');

      botao('Tentar de novo').click();
      fixture.detectChanges();

      expect(lojaService.listar).toHaveBeenCalledTimes(2);
      expect(campo('[data-testid="erro-contexto"]')).toBeNull();
    });
  });

  describe('promotor', () => {
    it('não tem o filtro de promotor, não carrega a lista de promotores e vê o aviso', async () => {
      await montar();
      marcaService.listar.and.returnValue(of({ marcas: [], limite: 2 }));
      promotorService.meusVinculos.and.returnValue(
        of({ vinculos: [{ marcaId: 'm2', marcaNome: 'Beta', gestorNome: 'G', marcaAtiva: true, entrouEm: '2026-01-01T00:00:00Z' }] }),
      );
      fixture.detectChanges();

      expect(campo('#filtro-autor')).toBeNull();
      expect(promotorService.listar).not.toHaveBeenCalled();
      expect(texto('[data-testid="aviso-promotor"]')).toContain('apenas as reposições registradas por você');
    });
  });

  describe('resultado', () => {
    it('mostra o resumo, as linhas e o link de edição quando permitido', async () => {
      await montar();
      relatorioService.consultar.and.returnValue(of(relatorio([reposicao, { ...reposicao, id: 'r2', podeEditar: false }], 2, 0, 1, 12)));
      fixture.detectChanges();

      expect(texto('[data-testid="resumo"]')).toBe('2 reposições · 12 unidades');
      expect(elemento().querySelectorAll('[data-testid="linha"]').length).toBe(2);
      expect(texto('[data-testid="linha"]')).toContain('Centro');
      expect(texto('[data-testid="linha"]')).toContain('Sabonete × 5');
      expect(elemento().querySelectorAll('a[href="/painel/reposicoes/m1/r1"]').length).toBe(1);
      expect(elemento().querySelector('a[href="/painel/reposicoes/m1/r2"]')).toBeNull();
    });

    it('usa o singular no resumo', async () => {
      await montar();
      relatorioService.consultar.and.returnValue(of(relatorio([reposicao], 1, 0, 1, 1)));
      fixture.detectChanges();

      expect(texto('[data-testid="resumo"]')).toBe('1 reposição · 1 unidade');
    });

    it('mostra o estado vazio e desabilita a exportação', async () => {
      await montar();
      relatorioService.consultar.and.returnValue(of(relatorio([], 0, 0, 0, 0)));
      fixture.detectChanges();

      expect(campo('[data-testid="vazio"]')).not.toBeNull();
      expect(campo<HTMLButtonElement>('[data-testid="exportar-desabilitado"]').disabled).toBeTrue();
      expect(campo('[data-testid="exportar"]')).toBeNull();
    });

    it('mostra erro e permite tentar de novo quando a consulta falha', async () => {
      await montar();
      relatorioService.consultar.and.returnValues(throwError(() => new Error('falha')), of(relatorio([reposicao])));
      fixture.detectChanges();

      expect(campo('[data-testid="erro-relatorio"]').textContent).toContain('Não foi possível carregar o relatório');

      botao('Tentar de novo').click();
      fixture.detectChanges();

      expect(campo('[data-testid="erro-relatorio"]')).toBeNull();
      expect(elemento().querySelectorAll('[data-testid="linha"]').length).toBe(1);
    });

    it('mostra o carregamento enquanto consulta', async () => {
      await montar();
      relatorioService.consultar.and.returnValue(new Subject<Relatorio>());
      fixture.detectChanges();

      expect(elemento().textContent).toContain('Carregando...');
    });
  });

  describe('ordenação', () => {
    beforeEach(async () => {
      await montar();
      fixture.detectChanges();
    });

    function cabecalho(rotulo: string): HTMLElement {
      return botao(rotulo).closest('th') as HTMLElement;
    }

    it('começa ordenado por data decrescente, indicado via aria-sort', () => {
      expect(cabecalho('Data e hora').getAttribute('aria-sort')).toBe('descending');
      expect(cabecalho('Loja').getAttribute('aria-sort')).toBe('none');
    });

    it('clicar na coluna ativa inverte o sentido', () => {
      botao('Data e hora').click();
      fixture.detectChanges();

      expect(ultimoFiltro().ordenar).toBe('data');
      expect(ultimoFiltro().direcao).toBe('asc');
      expect(cabecalho('Data e hora').getAttribute('aria-sort')).toBe('ascending');
    });

    it('clicar em outra coluna começa crescente e volta para a primeira página', () => {
      botao('Loja').click();
      fixture.detectChanges();

      expect(ultimoFiltro().ordenar).toBe('loja');
      expect(ultimoFiltro().direcao).toBe('asc');
      expect(relatorioService.consultar.calls.mostRecent().args[2]).toBe(0);
      expect(cabecalho('Loja').getAttribute('aria-sort')).toBe('ascending');
      expect(cabecalho('Data e hora').getAttribute('aria-sort')).toBe('none');
    });

    it('voltar para a data começa decrescente', () => {
      botao('Autor').click();
      fixture.detectChanges();
      botao('Data e hora').click();
      fixture.detectChanges();

      expect(ultimoFiltro().ordenar).toBe('data');
      expect(ultimoFiltro().direcao).toBe('desc');
    });
  });

  describe('paginação', () => {
    it('navega entre as páginas mantendo os filtros', async () => {
      await montar();
      relatorioService.consultar.and.returnValues(
        of(relatorio([reposicao], 45, 0, 3)),
        of(relatorio([reposicao], 45, 1, 3)),
        of(relatorio([reposicao], 45, 0, 3)),
      );
      fixture.detectChanges();

      expect(texto('[data-testid="pagina-atual"]')).toBe('Página 1 de 3');
      expect(botao('Anterior').disabled).toBeTrue();

      botao('Próxima').click();
      fixture.detectChanges();
      expect(relatorioService.consultar.calls.mostRecent().args[2]).toBe(1);
      expect(texto('[data-testid="pagina-atual"]')).toBe('Página 2 de 3');

      botao('Anterior').click();
      fixture.detectChanges();
      expect(relatorioService.consultar.calls.mostRecent().args[2]).toBe(0);
    });

    it('não mostra a paginação com uma página só e desabilita "Próxima" na última', async () => {
      await montar();
      fixture.detectChanges();
      expect(campo('nav[aria-label="Paginação"]')).toBeNull();

      relatorioService.consultar.and.returnValue(of(relatorio([reposicao], 45, 2, 3)));
      selecionar('#filtro-loja', 'l1');

      expect(botao('Próxima').disabled).toBeTrue();
    });
  });

  describe('exportação', () => {
    it('oferece o link de download do CSV com a URL dos filtros atuais', async () => {
      await montar();
      fixture.detectChanges();

      const link = campo<HTMLAnchorElement>('[data-testid="exportar"]');
      expect(link.getAttribute('href')).toBe('/csv/m1');
      expect(link.hasAttribute('download')).toBeTrue();
      expect(relatorioService.urlDoCsv).toHaveBeenCalledWith('m1', jasmine.objectContaining({ ordenar: 'data' }));
    });

    it('bloqueia a exportação e avisa quando passa do máximo de 5.000 reposições', async () => {
      await montar();
      relatorioService.consultar.and.returnValue(of(relatorio([reposicao], 5001, 0, 251)));
      fixture.detectChanges();

      expect(campo('[data-testid="exportar"]')).toBeNull();
      expect(campo<HTMLButtonElement>('[data-testid="exportar-desabilitado"]').disabled).toBeTrue();
      expect(texto('[data-testid="aviso-exportacao"]')).toContain('máximo de 5000 reposições');
    });

    it('permite exportar exatamente 5.000', async () => {
      await montar();
      relatorioService.consultar.and.returnValue(of(relatorio([reposicao], 5000, 0, 250)));
      fixture.detectChanges();

      expect(campo('[data-testid="exportar"]')).not.toBeNull();
      expect(campo('[data-testid="aviso-exportacao"]')).toBeNull();
    });
  });
});

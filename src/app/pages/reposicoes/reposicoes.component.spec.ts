import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Pagina, Reposicao } from '../../models/reposicao.model';
import { ReposicaoService } from '../../services/reposicao.service';
import { ReposicoesComponent } from './reposicoes.component';

describe('ReposicoesComponent', () => {
  const editavel: Reposicao = {
    id: 'r1',
    marcaId: 'm1',
    marcaNome: 'Alfa',
    lojaId: 'l1',
    lojaNome: 'Centro',
    autorNome: 'Ana',
    repostoEm: '2026-03-10T12:00:00Z',
    observacoes: 'Gôndola cheia',
    itens: [
      { produtoId: 'p1', produtoNome: 'Sabonete', quantidade: 10 },
      { produtoId: 'p2', produtoNome: 'Shampoo', quantidade: 1 },
    ],
    totalUnidades: 11,
    criadoEm: '2026-03-10T12:05:00Z',
    podeEditar: true,
    editavelAte: '2026-03-11T12:05:00Z',
  };
  const encerrada: Reposicao = { ...editavel, id: 'r2', podeEditar: false, totalUnidades: 1, itens: [{ produtoId: 'p1', produtoNome: 'Sabonete', quantidade: 1 }] };
  const doGestor: Reposicao = { ...editavel, id: 'r3', editavelAte: null };
  let fixture: ComponentFixture<ReposicoesComponent>;
  let reposicaoService: jasmine.SpyObj<ReposicaoService>;

  function pagina(conteudo: Reposicao[], numero = 0, totalPaginas = 1): Pagina<Reposicao> {
    return { conteudo, pagina: numero, tamanho: 10, totalElementos: conteudo.length, totalPaginas };
  }

  async function montar(marcaId: string | null): Promise<void> {
    reposicaoService = jasmine.createSpyObj<ReposicaoService>('ReposicaoService', ['listarMinhas', 'listarDaMarca', 'excluir']);
    await TestBed.configureTestingModule({
      imports: [ReposicoesComponent],
      providers: [
        provideRouter([]),
        { provide: ReposicaoService, useValue: reposicaoService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(marcaId === null ? {} : { marcaId }) } } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ReposicoesComponent);
  }

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function botao(texto: string): HTMLButtonElement {
    return Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  }

  describe('minhas reposições', () => {
    beforeEach(async () => montar(null));

    it('mostra o carregamento e busca a primeira página das minhas reposições', () => {
      reposicaoService.listarMinhas.and.returnValue(new Subject<Pagina<Reposicao>>());
      fixture.detectChanges();

      expect(elemento().textContent).toContain('Carregando reposições...');
      expect(reposicaoService.listarMinhas).toHaveBeenCalledWith(0, 10);
      expect(reposicaoService.listarDaMarca).not.toHaveBeenCalled();
    });

    it('lista as reposições com marca, loja, total, itens e observações', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([editavel])));
      fixture.detectChanges();

      expect(elemento().querySelector('h1')?.textContent).toContain('Minhas reposições');
      const texto = elemento().querySelector('[data-testid="reposicao"]')?.textContent ?? '';
      expect(texto).toContain('Centro');
      expect(texto).toContain('Alfa');
      expect(texto).toContain('Gôndola cheia');
      expect(elemento().querySelector('[data-testid="total-unidades"]')?.textContent?.trim()).toBe('11 unidades');
      expect(elemento().querySelector('[data-testid="itens"]')?.textContent).toContain('Sabonete × 10, Shampoo × 1');
    });

    it('usa o singular para uma unidade', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([encerrada])));
      fixture.detectChanges();

      expect(elemento().querySelector('[data-testid="total-unidades"]')?.textContent?.trim()).toBe('1 unidade');
    });

    it('mostra o estado vazio com atalho para registrar', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([])));
      fixture.detectChanges();

      expect(elemento().textContent).toContain('Nenhuma reposição registrada');
      expect(elemento().querySelectorAll('a[href="/painel/reposicoes/nova"]').length).toBe(2);
    });

    it('oferece editar e excluir com o prazo quando o usuário pode editar', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([editavel])));
      fixture.detectChanges();

      expect(elemento().querySelector('a[href="/painel/reposicoes/m1/r1"]')).not.toBeNull();
      expect(botao('Excluir')).toBeDefined();
      expect(elemento().querySelector('[data-testid="prazo"]')?.textContent).toContain('Editável até');
    });

    it('esconde as ações e explica quando o prazo de edição terminou', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([encerrada])));
      fixture.detectChanges();

      expect(elemento().querySelector('a[href="/painel/reposicoes/m1/r2"]')).toBeNull();
      expect(elemento().querySelector('[data-testid="prazo-encerrado"]')?.textContent).toContain('fale com o gestor');
    });

    it('para o gestor (sem prazo) oferece as ações sem mostrar prazo', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([doGestor])));
      fixture.detectChanges();

      expect(elemento().querySelector('a[href="/painel/reposicoes/m1/r3"]')).not.toBeNull();
      expect(elemento().querySelector('[data-testid="prazo"]')).toBeNull();
    });

    it('mostra erro e permite tentar de novo quando a listagem falha', () => {
      reposicaoService.listarMinhas.and.returnValues(throwError(() => new Error('falha')), of(pagina([editavel])));
      fixture.detectChanges();

      expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar as reposições');

      botao('Tentar de novo').click();
      fixture.detectChanges();

      expect(reposicaoService.listarMinhas).toHaveBeenCalledTimes(2);
      expect(elemento().textContent).toContain('Centro');
    });

    it('navega entre as páginas', () => {
      reposicaoService.listarMinhas.and.returnValues(of(pagina([editavel], 0, 3)), of(pagina([doGestor], 1, 3)), of(pagina([editavel], 0, 3)));
      fixture.detectChanges();

      expect(elemento().querySelector('[data-testid="pagina-atual"]')?.textContent?.trim()).toBe('Página 1 de 3');
      expect(botao('Anterior').disabled).toBeTrue();

      botao('Próxima').click();
      fixture.detectChanges();
      expect(reposicaoService.listarMinhas).toHaveBeenCalledWith(1, 10);
      expect(elemento().querySelector('[data-testid="pagina-atual"]')?.textContent?.trim()).toBe('Página 2 de 3');

      botao('Anterior').click();
      fixture.detectChanges();
      expect(reposicaoService.listarMinhas).toHaveBeenCalledWith(0, 10);
    });

    it('não mostra a paginação quando há uma página só', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([editavel])));
      fixture.detectChanges();

      expect(elemento().querySelector('nav[aria-label="Paginação"]')).toBeNull();
    });

    it('desabilita "Próxima" na última página', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([editavel], 2, 3)));
      fixture.detectChanges();

      expect(botao('Próxima').disabled).toBeTrue();
      expect(botao('Anterior').disabled).toBeFalse();
    });

    it('pede confirmação antes de excluir e permite cancelar', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([editavel])));
      fixture.detectChanges();

      botao('Excluir').click();
      fixture.detectChanges();

      expect(elemento().querySelector('[role="alertdialog"]')?.textContent).toContain('Excluir esta reposição?');
      expect(reposicaoService.excluir).not.toHaveBeenCalled();

      botao('Cancelar').click();
      fixture.detectChanges();

      expect(elemento().querySelector('[role="alertdialog"]')).toBeNull();
    });

    it('exclui a reposição confirmada e recarrega a mesma página', () => {
      reposicaoService.listarMinhas.and.returnValues(of(pagina([editavel, doGestor], 1, 2)), of(pagina([doGestor], 1, 2)));
      reposicaoService.excluir.and.returnValue(of(undefined));
      fixture.detectChanges();

      botao('Excluir').click();
      fixture.detectChanges();
      botao('Excluir').click();
      fixture.detectChanges();

      expect(reposicaoService.excluir).toHaveBeenCalledWith('m1', 'r1');
      expect(reposicaoService.listarMinhas).toHaveBeenCalledTimes(2);
      expect(reposicaoService.listarMinhas.calls.mostRecent().args).toEqual([1, 10]);
    });

    it('volta uma página quando exclui a última reposição de uma página que não é a primeira', () => {
      reposicaoService.listarMinhas.and.returnValues(of(pagina([editavel], 2, 3)), of(pagina([doGestor], 1, 2)));
      reposicaoService.excluir.and.returnValue(of(undefined));
      fixture.detectChanges();

      botao('Excluir').click();
      fixture.detectChanges();
      botao('Excluir').click();
      fixture.detectChanges();

      expect(reposicaoService.listarMinhas.calls.mostRecent().args).toEqual([1, 10]);
    });

    it('mostra o erro da API e mantém a lista quando a exclusão falha', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([editavel])));
      reposicaoService.excluir.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 403, error: { codigo: 'JANELA_EDICAO_ENCERRADA', detail: 'O prazo para alterar ou excluir esta reposição já terminou.' } })),
      );
      fixture.detectChanges();

      botao('Excluir').click();
      fixture.detectChanges();
      botao('Excluir').click();
      fixture.detectChanges();

      expect(elemento().querySelector('p[role="alert"]')?.textContent).toContain('O prazo para alterar ou excluir');
      expect(elemento().textContent).toContain('Centro');
    });

    it('desabilita os botões enquanto exclui', () => {
      reposicaoService.listarMinhas.and.returnValue(of(pagina([editavel])));
      reposicaoService.excluir.and.returnValue(new Subject<void>());
      fixture.detectChanges();

      botao('Excluir').click();
      fixture.detectChanges();
      botao('Excluir').click();
      fixture.detectChanges();

      expect(botao('Excluindo...').disabled).toBeTrue();
      expect(botao('Cancelar').disabled).toBeTrue();
    });
  });

  describe('reposições da marca', () => {
    beforeEach(async () => montar('m1'));

    it('busca as reposições da marca da rota e mostra quem registrou', () => {
      reposicaoService.listarDaMarca.and.returnValue(of(pagina([editavel])));
      fixture.detectChanges();

      expect(reposicaoService.listarDaMarca).toHaveBeenCalledWith('m1', 0, 10);
      expect(reposicaoService.listarMinhas).not.toHaveBeenCalled();
      expect(elemento().querySelector('h1')?.textContent).toContain('Reposições da marca');
      expect(elemento().querySelector('header p strong')?.textContent).toBe('Alfa');
      expect(elemento().querySelector('[data-testid="reposicao"]')?.textContent).toContain('por Ana');
    });

    it('tem o link de volta e leva a marca ao registrar uma nova reposição', () => {
      reposicaoService.listarDaMarca.and.returnValue(of(pagina([editavel])));
      fixture.detectChanges();

      expect(elemento().querySelector('a[href="/painel/marcas"]')).not.toBeNull();
      expect(elemento().querySelector('header a[href="/painel/reposicoes/nova?marca=m1"]')).not.toBeNull();
    });

    it('mostra marca não encontrada quando a API responde 404', () => {
      reposicaoService.listarDaMarca.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO' } })));
      fixture.detectChanges();

      expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Marca não encontrada.');
    });
  });
});

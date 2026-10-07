import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { paraCampoLocal } from '../../core/data-hora';
import { LojasDaMarca } from '../../models/loja.model';
import { MinhasMarcas } from '../../models/marca.model';
import { ProdutosDaMarca } from '../../models/produto.model';
import { MeusVinculos } from '../../models/promotor.model';
import { Reposicao } from '../../models/reposicao.model';
import { LojaService } from '../../services/loja.service';
import { MarcaService } from '../../services/marca.service';
import { ProdutoService } from '../../services/produto.service';
import { PromotorService } from '../../services/promotor.service';
import { ReposicaoService } from '../../services/reposicao.service';
import { ReposicaoFormularioComponent } from './reposicao-formulario.component';

describe('ReposicaoFormularioComponent', () => {
  const lojas: LojasDaMarca = {
    lojas: [
      { id: 'l1', nome: 'Centro', cidade: 'Campinas', uf: 'SP', endereco: null, criadoEm: '2026-01-01T00:00:00Z' },
      { id: 'l2', nome: 'Norte', cidade: 'Santos', uf: 'SP', endereco: null, criadoEm: '2026-01-01T00:00:00Z' },
    ],
    limite: 5,
  };
  const produtos: ProdutosDaMarca = {
    produtos: [
      { id: 'p1', nome: 'Sabonete', codigo: null, cor: null, ativo: true, criadoEm: '2026-01-01T00:00:00Z' },
      { id: 'p2', nome: 'Shampoo', codigo: null, cor: '#4f46e5', ativo: true, criadoEm: '2026-01-01T00:00:00Z' },
      { id: 'p3', nome: 'Antigo', codigo: null, cor: null, ativo: false, criadoEm: '2026-01-01T00:00:00Z' },
    ],
    limite: 10,
  };
  const marcasGeridas: MinhasMarcas = {
    marcas: [{ id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' }],
    limite: 2,
  };
  const semVinculos: MeusVinculos = { vinculos: [] };
  const reposicaoExistente: Reposicao = {
    id: 'r1',
    marcaId: 'm1',
    marcaNome: 'Alfa',
    lojaId: 'l2',
    lojaNome: 'Norte',
    autorNome: 'Ana',
    repostoEm: new Date(2026, 2, 10, 9, 30).toISOString(),
    observacoes: 'Antes',
    itens: [
      { produtoId: 'p1', produtoNome: 'Sabonete', quantidade: 10 },
      { produtoId: 'p3', produtoNome: 'Antigo', quantidade: 2 },
    ],
    totalUnidades: 12,
    criadoEm: '2026-03-10T12:05:00Z',
    podeEditar: true,
    editavelAte: '2026-03-11T12:05:00Z',
  };

  let fixture: ComponentFixture<ReposicaoFormularioComponent>;
  let reposicaoService: jasmine.SpyObj<ReposicaoService>;
  let marcaService: jasmine.SpyObj<MarcaService>;
  let promotorService: jasmine.SpyObj<PromotorService>;
  let lojaService: jasmine.SpyObj<LojaService>;
  let produtoService: jasmine.SpyObj<ProdutoService>;
  let router: Router;

  async function montar(rota: Record<string, string> = {}, consulta: Record<string, string> = {}): Promise<void> {
    reposicaoService = jasmine.createSpyObj<ReposicaoService>('ReposicaoService', ['buscar', 'criar', 'atualizar']);
    marcaService = jasmine.createSpyObj<MarcaService>('MarcaService', ['listar']);
    promotorService = jasmine.createSpyObj<PromotorService>('PromotorService', ['meusVinculos']);
    lojaService = jasmine.createSpyObj<LojaService>('LojaService', ['listar']);
    produtoService = jasmine.createSpyObj<ProdutoService>('ProdutoService', ['listar']);
    marcaService.listar.and.returnValue(of(marcasGeridas));
    promotorService.meusVinculos.and.returnValue(of(semVinculos));
    lojaService.listar.and.returnValue(of(lojas));
    produtoService.listar.and.returnValue(of(produtos));

    await TestBed.configureTestingModule({
      imports: [ReposicaoFormularioComponent],
      providers: [
        provideRouter([]),
        { provide: ReposicaoService, useValue: reposicaoService },
        { provide: MarcaService, useValue: marcaService },
        { provide: PromotorService, useValue: promotorService },
        { provide: LojaService, useValue: lojaService },
        { provide: ProdutoService, useValue: produtoService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(rota), queryParamMap: convertToParamMap(consulta) } },
        },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ReposicaoFormularioComponent);
  }

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const campo = <T extends HTMLElement>(seletor: string): T => elemento().querySelector<T>(seletor)!;
  const botao = (texto: string): HTMLButtonElement =>
    Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;

  function selecionar(seletor: string, valor: string): void {
    const select = campo<HTMLSelectElement>(seletor);
    select.value = valor;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function digitar(seletor: string, valor: string): void {
    const entrada = campo<HTMLInputElement | HTMLTextAreaElement>(seletor);
    entrada.value = valor;
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(): void {
    campo('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function preencherValido(): void {
    selecionar('#loja', 'l1');
    botao('Adicionar produto').click();
    fixture.detectChanges();
    selecionar('#produto-0', 'p1');
    digitar('#quantidade-0', '10');
  }

  describe('criação', () => {
    describe('carregamento das marcas', () => {
      it('junta as marcas geridas e as de promotor, sem repetir, em ordem alfabética', async () => {
        await montar();
        marcaService.listar.and.returnValue(
          of({
            marcas: [
              { id: 'm2', nome: 'Zeta', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' },
              { id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' },
            ],
            limite: 2,
          }),
        );
        promotorService.meusVinculos.and.returnValue(
          of({
            vinculos: [
              { marcaId: 'm1', marcaNome: 'Alfa', gestorNome: 'G', marcaAtiva: true, entrouEm: '2026-01-01T00:00:00Z' },
              { marcaId: 'm3', marcaNome: 'Beta', gestorNome: 'G', marcaAtiva: true, entrouEm: '2026-01-01T00:00:00Z' },
            ],
          }),
        );
        fixture.detectChanges();

        const nomes = Array.from(campo<HTMLSelectElement>('#marca').options).map((o) => o.textContent?.trim());
        expect(nomes).toEqual(['Selecione a marca', 'Alfa', 'Beta', 'Zeta']);
        expect(campo('#loja', )).toBeNull();
      });

      it('não lista marcas inativas em que o usuário é promotor', async () => {
        await montar();
        marcaService.listar.and.returnValue(of({ marcas: [], limite: 2 }));
        promotorService.meusVinculos.and.returnValue(
          of({
            vinculos: [
              { marcaId: 'm1', marcaNome: 'Alfa', gestorNome: 'G', marcaAtiva: true, entrouEm: '2026-01-01T00:00:00Z' },
              { marcaId: 'm2', marcaNome: 'Beta', gestorNome: 'G', marcaAtiva: false, entrouEm: '2026-01-01T00:00:00Z' },
            ],
          }),
        );
        fixture.detectChanges();

        const nomes = Array.from(campo<HTMLSelectElement>('#marca').options).map((o) => o.textContent?.trim());
        expect(nomes).toEqual(['Selecione a marca', 'Alfa']);
      });

      it('seleciona a única marca disponível e carrega lojas e produtos', async () => {
        await montar();
        fixture.detectChanges();

        expect(campo<HTMLSelectElement>('#marca').value).toBe('m1');
        expect(lojaService.listar).toHaveBeenCalledWith('m1');
        expect(produtoService.listar).toHaveBeenCalledWith('m1');
        expect(campo('#loja')).not.toBeNull();
      });

      it('pré-seleciona a marca informada na URL', async () => {
        await montar({}, { marca: 'm2' });
        marcaService.listar.and.returnValue(
          of({
            marcas: [
              { id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' },
              { id: 'm2', nome: 'Beta', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' },
            ],
            limite: 2,
          }),
        );
        fixture.detectChanges();

        expect(campo<HTMLSelectElement>('#marca').value).toBe('m2');
        expect(lojaService.listar).toHaveBeenCalledWith('m2');
      });

      it('com várias marcas não carrega nada até escolher uma', async () => {
        await montar();
        marcaService.listar.and.returnValue(
          of({
            marcas: [
              { id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' },
              { id: 'm2', nome: 'Beta', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' },
            ],
            limite: 2,
          }),
        );
        fixture.detectChanges();

        expect(lojaService.listar).not.toHaveBeenCalled();

        selecionar('#marca', 'm2');

        expect(lojaService.listar).toHaveBeenCalledWith('m2');
        expect(produtoService.listar).toHaveBeenCalledWith('m2');
      });

      it('trocar de marca limpa a loja e os itens escolhidos', async () => {
        await montar();
        marcaService.listar.and.returnValue(
          of({
            marcas: [
              { id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' },
              { id: 'm2', nome: 'Beta', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' },
            ],
            limite: 2,
          }),
        );
        fixture.detectChanges();
        selecionar('#marca', 'm1');
        preencherValido();
        expect(elemento().querySelectorAll('[data-testid="item"]').length).toBe(1);

        selecionar('#marca', 'm2');

        expect(elemento().querySelectorAll('[data-testid="item"]').length).toBe(0);
        expect(campo<HTMLSelectElement>('#loja').value).toBe('');
      });

      it('explica o que fazer quando o usuário não tem marcas nem vínculos', async () => {
        await montar();
        marcaService.listar.and.returnValue(of({ marcas: [], limite: 2 }));
        fixture.detectChanges();

        expect(elemento().textContent).toContain('Você ainda não pode registrar reposições');
        expect(campo('a[href="/painel/marcas"]')).not.toBeNull();
        expect(campo('a[href="/painel/promotor"]')).not.toBeNull();
        expect(campo('form')).toBeNull();
      });

      it('mostra erro e permite tentar de novo quando o carregamento falha', async () => {
        await montar();
        marcaService.listar.and.returnValues(throwError(() => new Error('falha')), of(marcasGeridas));
        fixture.detectChanges();

        expect(campo('[role="alert"]').textContent).toContain('Não foi possível carregar os dados da reposição');

        botao('Tentar de novo').click();
        fixture.detectChanges();

        expect(marcaService.listar).toHaveBeenCalledTimes(2);
        expect(campo('form')).not.toBeNull();
      });

      it('mostra erro e permite tentar de novo quando lojas e produtos não carregam', async () => {
        await montar();
        lojaService.listar.and.returnValues(throwError(() => new Error('falha')), of(lojas));
        fixture.detectChanges();

        expect(elemento().textContent).toContain('Não foi possível carregar as lojas e os produtos');

        botao('Tentar de novo').click();
        fixture.detectChanges();

        expect(campo('#loja')).not.toBeNull();
      });

      it('avisa quando a marca não tem lojas ou não tem produtos ativos', async () => {
        await montar();
        lojaService.listar.and.returnValue(of({ lojas: [], limite: 5 }));
        fixture.detectChanges();
        expect(campo('[data-testid="sem-lojas"]')).not.toBeNull();
        expect(campo('#loja')).toBeNull();

        TestBed.resetTestingModule();
        await montar();
        produtoService.listar.and.returnValue(of({ produtos: [produtos.produtos[2]], limite: 10 }));
        fixture.detectChanges();
        expect(campo('[data-testid="sem-produtos"]')).not.toBeNull();
      });
    });

    describe('formulário', () => {
      beforeEach(async () => {
        await montar();
        fixture.detectChanges();
      });

      it('mostra as lojas com cidade e UF e só os produtos ativos', () => {
        const lojasNaTela = Array.from(campo<HTMLSelectElement>('#loja').options).map((o) => o.textContent?.trim());
        expect(lojasNaTela).toEqual(['Selecione a loja', 'Centro (Campinas/SP)', 'Norte (Santos/SP)']);

        botao('Adicionar produto').click();
        fixture.detectChanges();
        const produtosNaTela = Array.from(campo<HTMLSelectElement>('#produto-0').options).map((o) => o.textContent?.trim());
        expect(produtosNaTela).toEqual(['Selecione o produto', 'Sabonete', 'Shampoo']);
      });

      it('mostra a cor de fundo na opção do produto que tem cor cadastrada', () => {
        botao('Adicionar produto').click();
        fixture.detectChanges();
        const opcoes = Array.from(campo<HTMLSelectElement>('#produto-0').options);

        expect(opcoes.find((o) => o.textContent?.trim() === 'Sabonete')?.style.backgroundColor).toBe('');
        expect(opcoes.find((o) => o.textContent?.trim() === 'Shampoo')?.style.backgroundColor).toBe('rgb(79, 70, 229)');
      });

      it('mostra um círculo com a cor do produto escolhido e some quando o produto não tem cor', () => {
        botao('Adicionar produto').click();
        fixture.detectChanges();

        expect(campo('[data-testid="cor-item"]')).toBeNull();

        selecionar('#produto-0', 'p2');
        expect(campo<HTMLElement>('[data-testid="cor-item"]').style.backgroundColor).toBe('rgb(79, 70, 229)');

        selecionar('#produto-0', 'p1');
        expect(campo('[data-testid="cor-item"]')).toBeNull();
      });

      it('traz a data e a hora atuais por padrão', () => {
        const valor = campo<HTMLInputElement>('#reposto-em').value;

        expect(valor).toBe(paraCampoLocal(new Date()).slice(0, 10) + valor.slice(10));
        expect(valor.length).toBe(16);
      });

      it('não envia e mostra os erros quando está vazio', () => {
        enviar();

        expect(reposicaoService.criar).not.toHaveBeenCalled();
        expect(campo('#loja-erro').textContent).toContain('Selecione a loja.');
        expect(campo('[data-testid="erro-itens"]').textContent).toContain('Adicione ao menos um produto.');
        expect(campo('#loja').getAttribute('aria-invalid')).toBe('true');
      });

      it('adiciona e remove linhas de produto e soma o total de unidades', () => {
        botao('Adicionar produto').click();
        fixture.detectChanges();
        selecionar('#produto-0', 'p1');
        digitar('#quantidade-0', '4');
        botao('Adicionar produto').click();
        fixture.detectChanges();
        selecionar('#produto-1', 'p2');
        digitar('#quantidade-1', '6');

        expect(campo('[data-testid="total-unidades"]').textContent?.trim()).toBe('Total: 10 unidades');

        campo<HTMLButtonElement>('button[aria-label="Remover produto 1"]').click();
        fixture.detectChanges();

        expect(elemento().querySelectorAll('[data-testid="item"]').length).toBe(1);
        expect(campo('[data-testid="total-unidades"]').textContent?.trim()).toBe('Total: 6 unidades');
      });

      it('usa o singular para uma unidade e ignora quantidades inválidas no total', () => {
        botao('Adicionar produto').click();
        fixture.detectChanges();
        digitar('#quantidade-0', '1');
        expect(campo('[data-testid="total-unidades"]').textContent?.trim()).toBe('Total: 1 unidade');

        digitar('#quantidade-0', '-5');
        expect(campo('[data-testid="total-unidades"]').textContent?.trim()).toBe('Total: 0 unidades');
      });

      it('não oferece em uma linha o produto já escolhido em outra', () => {
        botao('Adicionar produto').click();
        fixture.detectChanges();
        selecionar('#produto-0', 'p1');
        botao('Adicionar produto').click();
        fixture.detectChanges();

        const segunda = Array.from(campo<HTMLSelectElement>('#produto-1').options).map((o) => o.textContent?.trim());
        expect(segunda).toEqual(['Selecione o produto', 'Shampoo']);
        const primeira = Array.from(campo<HTMLSelectElement>('#produto-0').options).map((o) => o.textContent?.trim());
        expect(primeira).toEqual(['Selecione o produto', 'Sabonete', 'Shampoo']);
      });

      it('desabilita "Adicionar produto" quando todos os produtos já foram usados', () => {
        botao('Adicionar produto').click();
        fixture.detectChanges();
        selecionar('#produto-0', 'p1');
        botao('Adicionar produto').click();
        fixture.detectChanges();
        selecionar('#produto-1', 'p2');

        expect(botao('Adicionar produto').disabled).toBeTrue();
      });

      it('valida a quantidade: obrigatória, inteira, maior que zero e com teto', () => {
        botao('Adicionar produto').click();
        fixture.detectChanges();
        const verificar = (valor: string, mensagem: string): void => {
          digitar('#quantidade-0', valor);
          enviar();
          expect(elemento().textContent).toContain(mensagem);
        };

        verificar('', 'Informe a quantidade.');
        verificar('0', 'A quantidade deve ser maior que zero.');
        verificar('2.5', 'Use um número inteiro.');
        verificar('1000001', 'A quantidade deve ser no máximo 1.000.000.');
        expect(reposicaoService.criar).not.toHaveBeenCalled();
      });

      it('exige selecionar o produto em cada linha', () => {
        botao('Adicionar produto').click();
        fixture.detectChanges();
        selecionar('#loja', 'l1');
        digitar('#quantidade-0', '3');

        enviar();

        expect(elemento().textContent).toContain('Selecione o produto.');
        expect(reposicaoService.criar).not.toHaveBeenCalled();
      });

      it('rejeita data no futuro', () => {
        preencherValido();
        const amanha = new Date(Date.now() + 24 * 3600 * 1000);
        digitar('#reposto-em', paraCampoLocal(amanha));

        enviar();

        expect(campo('#reposto-em-erro').textContent).toContain('não pode estar no futuro');
        expect(reposicaoService.criar).not.toHaveBeenCalled();
      });

      it('exige a data', () => {
        preencherValido();
        digitar('#reposto-em', '');

        enviar();

        expect(campo('#reposto-em-erro').textContent).toContain('Informe a data e a hora.');
      });

      it('limita as observações a 1000 caracteres', () => {
        preencherValido();
        digitar('#observacoes', 'x'.repeat(1001));

        enviar();

        expect(campo('#observacoes-erro').textContent).toContain('no máximo 1000');
        expect(reposicaoService.criar).not.toHaveBeenCalled();
      });

      it('registra a reposição com os dados normalizados e volta para a lista', () => {
        reposicaoService.criar.and.returnValue(of(reposicaoExistente));
        preencherValido();
        const quando = new Date(2026, 0, 15, 8, 5);
        digitar('#reposto-em', paraCampoLocal(quando));
        digitar('#observacoes', '  Gôndola cheia  ');

        enviar();

        expect(reposicaoService.criar).toHaveBeenCalledOnceWith('m1', {
          lojaId: 'l1',
          repostoEm: quando.toISOString(),
          itens: [{ produtoId: 'p1', quantidade: 10 }],
          observacoes: 'Gôndola cheia',
        });
        expect(router.navigate).toHaveBeenCalledWith(['/painel/reposicoes']);
      });

      it('desabilita o botão enquanto salva', () => {
        reposicaoService.criar.and.returnValue(new Subject<Reposicao>());
        preencherValido();

        enviar();

        expect(botao('Salvando...').disabled).toBeTrue();
      });

      it('mostra a mensagem do servidor e mantém o formulário quando o registro falha', () => {
        reposicaoService.criar.and.returnValue(
          throwError(() => new HttpErrorResponse({ status: 400, error: { codigo: 'PRODUTO_INVALIDO', detail: 'Um ou mais produtos não pertencem a esta marca ou estão inativos.' } })),
        );
        preencherValido();

        enviar();

        expect(campo('form [role="alert"]').textContent).toContain('estão inativos');
        expect(router.navigate).not.toHaveBeenCalled();
        expect(campo<HTMLInputElement>('#quantidade-0').value).toBe('10');
      });

      it('mostra mensagem genérica quando não consegue conectar', () => {
        reposicaoService.criar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
        preencherValido();

        enviar();

        expect(campo('form [role="alert"]').textContent).toContain('Não foi possível conectar ao servidor');
      });
    });
  });

  describe('edição', () => {
    async function iniciarEdicao(reposicao: Reposicao = reposicaoExistente): Promise<void> {
      await montar({ marcaId: 'm1', id: 'r1' });
      reposicaoService.buscar.and.returnValue(of(reposicao));
      fixture.detectChanges();
    }

    it('carrega a reposição e preenche o formulário, incluindo produto que ficou inativo', async () => {
      await iniciarEdicao();

      expect(reposicaoService.buscar).toHaveBeenCalledWith('m1', 'r1');
      expect(campo('h1').textContent).toContain('Editar reposição');
      expect(campo('[data-testid="marca-fixa"]').textContent).toContain('Alfa');
      expect(campo('#marca')).toBeNull();
      expect(campo<HTMLSelectElement>('#loja').value).toBe('l2');
      expect(campo<HTMLInputElement>('#reposto-em').value).toBe('2026-03-10T09:30');
      expect(campo<HTMLTextAreaElement>('#observacoes').value).toBe('Antes');
      expect(campo<HTMLSelectElement>('#produto-0').value).toBe('p1');
      expect(campo<HTMLInputElement>('#quantidade-0').value).toBe('10');
      expect(campo<HTMLSelectElement>('#produto-1').value).toBe('p3');
      expect(botao('Salvar alterações')).toBeDefined();
    });

    it('mostra o círculo de cor também ao editar um item que já tem produto com cor', async () => {
      await iniciarEdicao({
        ...reposicaoExistente,
        itens: [{ produtoId: 'p2', produtoNome: 'Shampoo', quantidade: 5 }],
      });

      expect(campo<HTMLElement>('[data-testid="cor-item"]').style.backgroundColor).toBe('rgb(79, 70, 229)');
    });

    it('mostra até quando o promotor pode editar', async () => {
      await iniciarEdicao();

      expect(campo('[data-testid="marca-fixa"]').textContent).toContain('editável até');
    });

    it('não oferece produto inativo novo, só o que já estava na reposição', async () => {
      await iniciarEdicao({ ...reposicaoExistente, itens: [{ produtoId: 'p1', produtoNome: 'Sabonete', quantidade: 1 }] });

      const opcoes = Array.from(campo<HTMLSelectElement>('#produto-0').options).map((o) => o.textContent?.trim());
      expect(opcoes).toEqual(['Selecione o produto', 'Sabonete', 'Shampoo']);
    });

    it('atualiza a reposição com o id da rota e volta para a lista', async () => {
      await iniciarEdicao();
      reposicaoService.atualizar.and.returnValue(of(reposicaoExistente));
      digitar('#quantidade-0', '7');

      enviar();

      expect(reposicaoService.atualizar).toHaveBeenCalledOnceWith('m1', 'r1', {
        lojaId: 'l2',
        repostoEm: new Date(2026, 2, 10, 9, 30).toISOString(),
        itens: [
          { produtoId: 'p1', quantidade: 7 },
          { produtoId: 'p3', quantidade: 2 },
        ],
        observacoes: 'Antes',
      });
      expect(reposicaoService.criar).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/painel/reposicoes']);
    });

    it('mostra o erro do prazo quando o servidor recusa a alteração', async () => {
      await iniciarEdicao();
      reposicaoService.atualizar.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 403, error: { codigo: 'JANELA_EDICAO_ENCERRADA', detail: 'O prazo para alterar ou excluir esta reposição já terminou.' } })),
      );

      enviar();

      expect(campo('form [role="alert"]').textContent).toContain('O prazo para alterar');
    });

    it('esconde o formulário e explica quando o prazo de edição já terminou', async () => {
      await iniciarEdicao({ ...reposicaoExistente, podeEditar: false });

      expect(elemento().textContent).toContain('O prazo de edição desta reposição terminou');
      expect(campo('form')).toBeNull();
      expect(lojaService.listar).not.toHaveBeenCalled();
    });

    it('mostra reposição não encontrada quando a API responde 404', async () => {
      await montar({ marcaId: 'm1', id: 'r1' });
      reposicaoService.buscar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO' } })));
      fixture.detectChanges();

      expect(elemento().textContent).toContain('Reposição não encontrada.');
      expect(campo('form')).toBeNull();
    });

    it('mostra erro e permite tentar de novo quando a busca falha', async () => {
      await montar({ marcaId: 'm1', id: 'r1' });
      reposicaoService.buscar.and.returnValues(throwError(() => new HttpErrorResponse({ status: 0 })), of(reposicaoExistente));
      fixture.detectChanges();

      expect(campo('[role="alert"]').textContent).toContain('Não foi possível carregar os dados da reposição');

      botao('Tentar de novo').click();
      fixture.detectChanges();

      expect(reposicaoService.buscar).toHaveBeenCalledTimes(2);
      expect(campo('form')).not.toBeNull();
    });
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Produto } from '../../models/produto.model';
import { ProdutoService } from '../../services/produto.service';
import { ProdutoFormularioComponent } from './produto-formulario.component';

describe('ProdutoFormularioComponent', () => {
  const produto: Produto = { id: 'p1', nome: 'Sabonete', codigo: 'SKU-1', ativo: true, criadoEm: '2026-01-01T00:00:00Z' };
  let fixture: ComponentFixture<ProdutoFormularioComponent>;
  let produtoService: jasmine.SpyObj<ProdutoService>;
  let router: Router;

  async function montar(id: string | null): Promise<void> {
    produtoService = jasmine.createSpyObj<ProdutoService>('ProdutoService', ['buscar', 'criar', 'atualizar']);
    const parametros = id === null ? { marcaId: 'm1' } : { marcaId: 'm1', id };
    await TestBed.configureTestingModule({
      imports: [ProdutoFormularioComponent],
      providers: [
        provideRouter([]),
        { provide: ProdutoService, useValue: produtoService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(parametros) } } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  }

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const campoNome = (): HTMLInputElement => elemento().querySelector<HTMLInputElement>('#nome')!;
  const campoCodigo = (): HTMLInputElement => elemento().querySelector<HTMLInputElement>('#codigo')!;
  const botaoEnviar = (): HTMLButtonElement => elemento().querySelector<HTMLButtonElement>('button[type="submit"]')!;

  function digitar(campo: HTMLInputElement, valor: string): void {
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(): void {
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function erroHttp(status: number, corpo: object): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: corpo });
  }

  describe('criação', () => {
    beforeEach(async () => {
      await montar(null);
      fixture = TestBed.createComponent(ProdutoFormularioComponent);
      fixture.detectChanges();
    });

    it('mostra o título de novo produto e não busca nada na API', () => {
      expect(elemento().querySelector('h1')?.textContent).toContain('Novo produto');
      expect(botaoEnviar().textContent).toContain('Cadastrar produto');
      expect(produtoService.buscar).not.toHaveBeenCalled();
    });

    it('tem o link de volta para os produtos da marca', () => {
      expect(elemento().querySelector('a[href="/painel/marcas/m1/produtos"]')).not.toBeNull();
    });

    it('não envia e mostra erro quando o nome está vazio', () => {
      enviar();

      expect(produtoService.criar).not.toHaveBeenCalled();
      expect(elemento().querySelector('#nome-erro')?.textContent).toContain('Informe o nome do produto.');
      expect(campoNome().getAttribute('aria-invalid')).toBe('true');
    });

    it('não aceita nome só com espaços', () => {
      digitar(campoNome(), '   ');
      enviar();

      expect(produtoService.criar).not.toHaveBeenCalled();
      expect(elemento().querySelector('#nome-erro')).not.toBeNull();
    });

    it('respeita os tamanhos máximos', () => {
      digitar(campoNome(), 'n'.repeat(81));
      digitar(campoCodigo(), 'c'.repeat(41));
      enviar();

      expect(produtoService.criar).not.toHaveBeenCalled();
      expect(elemento().querySelector('#nome-erro')?.textContent).toContain('no máximo 80');
      expect(elemento().querySelector('#codigo-erro')?.textContent).toContain('no máximo 40');
    });

    it('cria o produto com os dados aparados e volta para a lista', () => {
      produtoService.criar.and.returnValue(of(produto));
      digitar(campoNome(), '  Sabonete  ');
      digitar(campoCodigo(), '  SKU-1 ');

      enviar();

      expect(produtoService.criar).toHaveBeenCalledWith('m1', { nome: 'Sabonete', codigo: 'SKU-1' });
      expect(router.navigate).toHaveBeenCalledWith(['/painel/marcas', 'm1', 'produtos']);
    });

    it('envia o código vazio quando não informado', () => {
      produtoService.criar.and.returnValue(of(produto));
      digitar(campoNome(), 'Sabonete');

      enviar();

      expect(produtoService.criar).toHaveBeenCalledWith('m1', { nome: 'Sabonete', codigo: '' });
    });

    it('desabilita o botão enquanto salva', () => {
      produtoService.criar.and.returnValue(new Subject<Produto>());
      digitar(campoNome(), 'Sabonete');

      enviar();

      expect(botaoEnviar().disabled).toBeTrue();
      expect(botaoEnviar().textContent).toContain('Salvando...');
    });

    it('mostra o erro no campo nome quando o nome já existe', () => {
      produtoService.criar.and.returnValue(
        throwError(() => erroHttp(409, { codigo: 'PRODUTO_NOME_DUPLICADO', detail: 'Esta marca já tem um produto com esse nome.' })),
      );
      digitar(campoNome(), 'Sabonete');

      enviar();

      expect(elemento().querySelector('#nome-erro')?.textContent).toContain('Esta marca já tem um produto com esse nome.');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('avisa quando o limite de produtos foi atingido', () => {
      produtoService.criar.and.returnValue(
        throwError(() => erroHttp(409, { codigo: 'LIMITE_PRODUTOS_ATINGIDO', detail: 'Esta marca já atingiu o limite de produtos do catálogo.' })),
      );
      digitar(campoNome(), 'Sabonete');

      enviar();

      const aviso = elemento().querySelector('[role="alert"]');
      expect(aviso?.textContent).toContain('Esta marca já atingiu o limite de produtos do catálogo.');
      expect(aviso?.textContent).toContain('Ver produtos da marca');
    });

    it('mapeia erros de validação do servidor para o campo', () => {
      produtoService.criar.and.returnValue(
        throwError(() =>
          erroHttp(400, { codigo: 'VALIDACAO_INVALIDA', detail: 'Dados inválidos.', erros: [{ campo: 'codigo', mensagem: 'Código inválido.' }] }),
        ),
      );
      digitar(campoNome(), 'Sabonete');

      enviar();

      expect(elemento().querySelector('#codigo-erro')?.textContent).toContain('Código inválido.');
    });

    it('mostra mensagem genérica quando não consegue conectar', () => {
      produtoService.criar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      digitar(campoNome(), 'Sabonete');

      enviar();

      expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar ao servidor');
    });
  });

  describe('edição', () => {
    async function iniciarEdicao(): Promise<void> {
      await montar('p1');
      fixture = TestBed.createComponent(ProdutoFormularioComponent);
    }

    it('carrega o produto e preenche o formulário', async () => {
      await iniciarEdicao();
      produtoService.buscar.and.returnValue(of(produto));
      fixture.detectChanges();

      expect(produtoService.buscar).toHaveBeenCalledWith('m1', 'p1');
      expect(elemento().querySelector('h1')?.textContent).toContain('Editar produto');
      expect(campoNome().value).toBe('Sabonete');
      expect(campoCodigo().value).toBe('SKU-1');
      expect(botaoEnviar().textContent).toContain('Salvar alterações');
    });

    it('preenche código vazio quando o produto não tem código', async () => {
      await iniciarEdicao();
      produtoService.buscar.and.returnValue(of({ ...produto, codigo: null }));
      fixture.detectChanges();

      expect(campoCodigo().value).toBe('');
    });

    it('mostra o carregamento enquanto busca o produto', async () => {
      await iniciarEdicao();
      produtoService.buscar.and.returnValue(new Subject<Produto>());
      fixture.detectChanges();

      expect(elemento().textContent).toContain('Carregando...');
      expect(elemento().querySelector('form')).toBeNull();
    });

    it('mostra produto não encontrado quando a API responde 404', async () => {
      await iniciarEdicao();
      produtoService.buscar.and.returnValue(throwError(() => erroHttp(404, { codigo: 'RECURSO_NAO_ENCONTRADO' })));
      fixture.detectChanges();

      expect(elemento().textContent).toContain('Produto não encontrado.');
      expect(elemento().querySelector('form')).toBeNull();
    });

    it('mostra o erro da API quando a busca falha por outro motivo', async () => {
      await iniciarEdicao();
      produtoService.buscar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      fixture.detectChanges();

      expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar ao servidor');
    });

    it('atualiza o produto e volta para a lista', async () => {
      await iniciarEdicao();
      produtoService.buscar.and.returnValue(of(produto));
      produtoService.atualizar.and.returnValue(of(produto));
      fixture.detectChanges();
      digitar(campoNome(), 'Sabonete Novo');

      enviar();

      expect(produtoService.atualizar).toHaveBeenCalledWith('m1', 'p1', { nome: 'Sabonete Novo', codigo: 'SKU-1' });
      expect(produtoService.criar).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/painel/marcas', 'm1', 'produtos']);
    });
  });
});

import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Marca } from '../../models/marca.model';
import { Produto, ProdutosDaMarca } from '../../models/produto.model';
import { MarcaService } from '../../services/marca.service';
import { ProdutoService } from '../../services/produto.service';
import { ProdutosComponent } from './produtos.component';

describe('ProdutosComponent', () => {
  const marca: Marca = { id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' };
  const sabonete: Produto = { id: 'p1', nome: 'Sabonete', codigo: 'SKU-1', cor: null, ativo: true, criadoEm: '2026-01-01T00:00:00Z' };
  const shampoo: Produto = { id: 'p2', nome: 'Shampoo', codigo: null, cor: null, ativo: true, criadoEm: '2026-01-02T00:00:00Z' };
  let fixture: ComponentFixture<ProdutosComponent>;
  let produtoService: jasmine.SpyObj<ProdutoService>;
  let marcaService: jasmine.SpyObj<MarcaService>;

  beforeEach(async () => {
    produtoService = jasmine.createSpyObj<ProdutoService>('ProdutoService', ['listar', 'excluir', 'atualizar']);
    marcaService = jasmine.createSpyObj<MarcaService>('MarcaService', ['buscar']);
    marcaService.buscar.and.returnValue(of(marca));
    await TestBed.configureTestingModule({
      imports: [ProdutosComponent],
      providers: [
        provideRouter([]),
        { provide: ProdutoService, useValue: produtoService },
        { provide: MarcaService, useValue: marcaService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ marcaId: 'm1' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProdutosComponent);
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function iniciar(resumo: ProdutosDaMarca): void {
    produtoService.listar.and.returnValue(of(resumo));
    fixture.detectChanges();
  }

  function botao(texto: string): HTMLButtonElement {
    return Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  }

  it('mostra o carregamento enquanto busca', () => {
    produtoService.listar.and.returnValue(new Subject<ProdutosDaMarca>());
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Carregando produtos...');
  });

  it('busca a marca e os produtos da marca da rota', () => {
    iniciar({ produtos: [], limite: 10 });

    expect(marcaService.buscar).toHaveBeenCalledWith('m1');
    expect(produtoService.listar).toHaveBeenCalledWith('m1');
    expect(elemento().querySelector('p strong')?.textContent).toBe('Alfa');
  });

  it('lista os produtos com código e o uso do limite', () => {
    iniciar({ produtos: [sabonete, shampoo], limite: 10 });

    const texto = elemento().textContent ?? '';
    expect(texto).toContain('Sabonete');
    expect(texto).toContain('Código: SKU-1');
    expect(texto).toContain('Sem código.');
    expect(elemento().querySelector('[data-testid="uso-produtos"]')?.textContent?.trim()).toBe('2/10 produtos ativos');
  });

  it('mostra o estado vazio com atalho para cadastrar o primeiro produto', () => {
    iniciar({ produtos: [], limite: 10 });

    expect(elemento().textContent).toContain('Esta marca ainda não tem produtos');
    expect(elemento().querySelector('a[href="/painel/marcas/m1/produtos/novo"]')).not.toBeNull();
  });

  it('oferece novo produto enquanto há vaga', () => {
    iniciar({ produtos: [sabonete], limite: 10 });

    expect(elemento().querySelector('header a[href="/painel/marcas/m1/produtos/novo"]')).not.toBeNull();
    expect(elemento().querySelector('#aviso-limite')).toBeNull();
  });

  it('bloqueia a criação e avisa quando o limite foi atingido', () => {
    iniciar({ produtos: [sabonete, shampoo], limite: 2 });

    expect(elemento().querySelector('header a[href="/painel/marcas/m1/produtos/novo"]')).toBeNull();
    expect(botao('Novo produto').disabled).toBeTrue();
    expect(elemento().querySelector('#aviso-limite')?.textContent).toContain('limite de 2 produtos');
  });

  it('tem o link de edição e o de volta para marcas', () => {
    iniciar({ produtos: [sabonete], limite: 10 });

    expect(elemento().querySelector('a[href="/painel/marcas/m1/produtos/p1"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/painel/marcas"]')).not.toBeNull();
  });

  it('mostra marca não encontrada quando a API responde 404', () => {
    marcaService.buscar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO' } })));
    produtoService.listar.and.returnValue(of({ produtos: [], limite: 10 }));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Marca não encontrada.');
    expect(elemento().querySelector('[data-testid="uso-produtos"]')).toBeNull();
  });

  it('mostra erro e permite tentar de novo quando a listagem falha', () => {
    produtoService.listar.and.returnValues(throwError(() => new Error('falha')), of({ produtos: [sabonete], limite: 10 }));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar os produtos');

    botao('Tentar de novo').click();
    fixture.detectChanges();

    expect(produtoService.listar).toHaveBeenCalledTimes(2);
    expect(elemento().textContent).toContain('Sabonete');
    expect(elemento().querySelector('[role="alert"]')).toBeNull();
  });

  it('pede confirmação antes de excluir e permite cancelar', () => {
    iniciar({ produtos: [sabonete], limite: 10 });

    botao('Excluir').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alertdialog"]')?.textContent).toContain('Excluir o produto');
    expect(produtoService.excluir).not.toHaveBeenCalled();

    botao('Cancelar').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('exclui o produto confirmado e o remove da lista', () => {
    iniciar({ produtos: [sabonete, shampoo], limite: 10 });
    produtoService.excluir.and.returnValue(of(null));

    botao('Excluir').click();
    fixture.detectChanges();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(produtoService.excluir).toHaveBeenCalledWith('m1', 'p1');
    expect(elemento().textContent).not.toContain('SKU-1');
    expect(elemento().textContent).toContain('Shampoo');
    expect(elemento().querySelector('[data-testid="uso-produtos"]')?.textContent?.trim()).toBe('1/10 produtos ativos');
  });

  it('mantém o produto e mostra o erro quando a exclusão falha', () => {
    iniciar({ produtos: [sabonete], limite: 10 });
    produtoService.excluir.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO', detail: 'Produto não encontrado.' } })),
    );

    botao('Excluir').click();
    fixture.detectChanges();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Sabonete');
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Produto não encontrado.');
  });

  it('conta apenas os produtos ativos no limite e marca os inativos', () => {
    iniciar({ produtos: [sabonete, { ...shampoo, ativo: false }], limite: 10 });

    expect(elemento().querySelector('[data-testid="uso-produtos"]')?.textContent?.trim()).toBe('1/10 produtos ativos');
    expect(elemento().querySelectorAll('[data-testid="selo-inativo"]').length).toBe(1);
    expect(botao('Reativar')).toBeDefined();
  });

  it('inativa em vez de remover quando a API devolve o produto, e avisa', () => {
    iniciar({ produtos: [sabonete, shampoo], limite: 10 });
    produtoService.excluir.and.returnValue(of({ ...sabonete, ativo: false }));

    botao('Excluir').click();
    fixture.detectChanges();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Sabonete');
    expect(elemento().querySelector('[data-testid="selo-inativo"]')).not.toBeNull();
    expect(elemento().querySelector('[data-testid="aviso-inativacao"]')?.textContent).toContain('já tem reposições registradas e foi inativado');
    expect(elemento().querySelector('[data-testid="uso-produtos"]')?.textContent?.trim()).toBe('1/10 produtos ativos');
  });

  it('reativa um produto inativo', () => {
    const inativo = { ...shampoo, ativo: false };
    iniciar({ produtos: [sabonete, inativo], limite: 10 });
    produtoService.atualizar.and.returnValue(of({ ...inativo, ativo: true }));

    botao('Reativar').click();
    fixture.detectChanges();

    expect(produtoService.atualizar).toHaveBeenCalledWith('m1', 'p2', { nome: 'Shampoo', codigo: '', cor: null, ativo: true });
    expect(elemento().querySelector('[data-testid="selo-inativo"]')).toBeNull();
    expect(elemento().querySelector('[data-testid="uso-produtos"]')?.textContent?.trim()).toBe('2/10 produtos ativos');
  });

  it('não deixa reativar quando o limite de ativos foi atingido', () => {
    iniciar({ produtos: [sabonete, { ...shampoo, ativo: false }], limite: 1 });

    expect(botao('Reativar').disabled).toBeTrue();
  });

  it('mostra o erro quando a reativação falha', () => {
    iniciar({ produtos: [{ ...shampoo, ativo: false }], limite: 10 });
    produtoService.atualizar.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { codigo: 'LIMITE_PRODUTOS_ATINGIDO', detail: 'Limite atingido.' } })),
    );

    botao('Reativar').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Limite atingido.');
    expect(elemento().querySelector('[data-testid="selo-inativo"]')).not.toBeNull();
  });

  it('desabilita os botões enquanto exclui', () => {
    iniciar({ produtos: [sabonete], limite: 10 });
    produtoService.excluir.and.returnValue(new Subject<Produto | null>());

    botao('Excluir').click();
    fixture.detectChanges();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(botao('Excluindo...').disabled).toBeTrue();
    expect(botao('Cancelar').disabled).toBeTrue();
  });
});

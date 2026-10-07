import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Loja, LojasDaMarca } from '../../models/loja.model';
import { Marca } from '../../models/marca.model';
import { LojaService } from '../../services/loja.service';
import { MarcaService } from '../../services/marca.service';
import { LojasComponent } from './lojas.component';

describe('LojasComponent', () => {
  const marca: Marca = { id: 'm1', nome: 'Alfa', descricao: null, ativa: true, criadoEm: '2026-01-01T00:00:00Z' };
  const centro: Loja = { id: 'l1', nome: 'Centro', cidade: 'Campinas', uf: 'SP', endereco: 'Rua A, 1', criadoEm: '2026-01-01T00:00:00Z' };
  const norte: Loja = { id: 'l2', nome: 'Norte', cidade: 'Santos', uf: 'SP', endereco: null, criadoEm: '2026-01-02T00:00:00Z' };
  let fixture: ComponentFixture<LojasComponent>;
  let lojaService: jasmine.SpyObj<LojaService>;
  let marcaService: jasmine.SpyObj<MarcaService>;

  beforeEach(async () => {
    lojaService = jasmine.createSpyObj<LojaService>('LojaService', ['listar', 'excluir']);
    marcaService = jasmine.createSpyObj<MarcaService>('MarcaService', ['buscar']);
    marcaService.buscar.and.returnValue(of(marca));
    await TestBed.configureTestingModule({
      imports: [LojasComponent],
      providers: [
        provideRouter([]),
        { provide: LojaService, useValue: lojaService },
        { provide: MarcaService, useValue: marcaService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ marcaId: 'm1' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LojasComponent);
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function iniciar(resumo: LojasDaMarca): void {
    lojaService.listar.and.returnValue(of(resumo));
    fixture.detectChanges();
  }

  function botao(texto: string): HTMLButtonElement {
    return Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  }

  it('mostra o carregamento enquanto busca', () => {
    lojaService.listar.and.returnValue(new Subject<LojasDaMarca>());
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Carregando lojas...');
  });

  it('busca a marca e as lojas da marca da rota', () => {
    iniciar({ lojas: [], limite: 5 });

    expect(marcaService.buscar).toHaveBeenCalledWith('m1');
    expect(lojaService.listar).toHaveBeenCalledWith('m1');
    expect(elemento().querySelector('p strong')?.textContent).toBe('Alfa');
  });

  it('lista as lojas com cidade, UF, endereço e o uso do limite', () => {
    iniciar({ lojas: [centro, norte], limite: 5 });

    const texto = elemento().textContent ?? '';
    expect(texto).toContain('Centro');
    expect(texto).toContain('Campinas - SP');
    expect(texto).toContain('Rua A, 1');
    expect(texto).toContain('Sem endereço informado.');
    expect(elemento().querySelector('[data-testid="uso-lojas"]')?.textContent?.trim()).toBe('2/5 lojas');
  });

  it('mostra o estado vazio com atalho para cadastrar a primeira loja', () => {
    iniciar({ lojas: [], limite: 5 });

    expect(elemento().textContent).toContain('Esta marca ainda não tem lojas');
    expect(elemento().querySelector('a[href="/painel/marcas/m1/lojas/nova"]')).not.toBeNull();
  });

  it('oferece nova loja enquanto há vaga', () => {
    iniciar({ lojas: [centro], limite: 5 });

    expect(elemento().querySelector('header a[href="/painel/marcas/m1/lojas/nova"]')).not.toBeNull();
    expect(elemento().querySelector('#aviso-limite')).toBeNull();
  });

  it('bloqueia a criação e avisa quando o limite foi atingido', () => {
    iniciar({ lojas: [centro, norte], limite: 2 });

    expect(elemento().querySelector('header a[href="/painel/marcas/m1/lojas/nova"]')).toBeNull();
    expect(botao('Nova loja').disabled).toBeTrue();
    expect(elemento().querySelector('#aviso-limite')?.textContent).toContain('limite de 2 lojas');
  });

  it('tem o link de edição e o de volta para marcas', () => {
    iniciar({ lojas: [centro], limite: 5 });

    expect(elemento().querySelector('a[href="/painel/marcas/m1/lojas/l1"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/painel/marcas"]')).not.toBeNull();
  });

  it('mostra marca não encontrada quando a API responde 404', () => {
    marcaService.buscar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO' } })));
    lojaService.listar.and.returnValue(of({ lojas: [], limite: 5 }));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Marca não encontrada.');
    expect(elemento().querySelector('[data-testid="uso-lojas"]')).toBeNull();
  });

  it('mostra erro e permite tentar de novo quando a listagem falha', () => {
    lojaService.listar.and.returnValues(throwError(() => new Error('falha')), of({ lojas: [centro], limite: 5 }));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar as lojas');

    botao('Tentar de novo').click();
    fixture.detectChanges();

    expect(lojaService.listar).toHaveBeenCalledTimes(2);
    expect(elemento().textContent).toContain('Centro');
    expect(elemento().querySelector('[role="alert"]')).toBeNull();
  });

  it('pede confirmação antes de excluir e permite cancelar', () => {
    iniciar({ lojas: [centro], limite: 5 });

    botao('Excluir').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alertdialog"]')?.textContent).toContain('Excluir a loja');
    expect(lojaService.excluir).not.toHaveBeenCalled();

    botao('Cancelar').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('exclui a loja confirmada e a remove da lista', () => {
    iniciar({ lojas: [centro, norte], limite: 5 });
    lojaService.excluir.and.returnValue(of(undefined));

    botao('Excluir').click();
    fixture.detectChanges();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(lojaService.excluir).toHaveBeenCalledWith('m1', 'l1');
    expect(elemento().textContent).not.toContain('Rua A, 1');
    expect(elemento().textContent).toContain('Norte');
    expect(elemento().querySelector('[data-testid="uso-lojas"]')?.textContent?.trim()).toBe('1/5 lojas');
  });

  it('mantém a loja e mostra o erro quando a exclusão falha', () => {
    iniciar({ lojas: [centro], limite: 5 });
    lojaService.excluir.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO', detail: 'Loja não encontrada.' } })),
    );

    botao('Excluir').click();
    fixture.detectChanges();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Centro');
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Loja não encontrada.');
  });

  it('desabilita os botões enquanto exclui', () => {
    iniciar({ lojas: [centro], limite: 5 });
    lojaService.excluir.and.returnValue(new Subject<void>());

    botao('Excluir').click();
    fixture.detectChanges();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(botao('Excluindo...').disabled).toBeTrue();
    expect(botao('Cancelar').disabled).toBeTrue();
  });
});

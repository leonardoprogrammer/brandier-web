import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Marca, MinhasMarcas } from '../../models/marca.model';
import { MarcaService } from '../../services/marca.service';
import { MarcasComponent } from './marcas.component';

describe('MarcasComponent', () => {
  const alfa: Marca = { id: '1', nome: 'Alfa', descricao: 'Descrição da Alfa', criadoEm: '2026-01-15T12:00:00Z' };
  const beta: Marca = { id: '2', nome: 'Beta', descricao: null, criadoEm: '2026-02-20T12:00:00Z' };
  let fixture: ComponentFixture<MarcasComponent>;
  let marcaService: jasmine.SpyObj<MarcaService>;

  beforeEach(async () => {
    marcaService = jasmine.createSpyObj<MarcaService>('MarcaService', ['listar', 'excluir']);
    await TestBed.configureTestingModule({
      imports: [MarcasComponent],
      providers: [provideRouter([]), { provide: MarcaService, useValue: marcaService }],
    }).compileComponents();

    fixture = TestBed.createComponent(MarcasComponent);
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function iniciar(resumo: MinhasMarcas): void {
    marcaService.listar.and.returnValue(of(resumo));
    fixture.detectChanges();
  }

  function botao(texto: string): HTMLButtonElement {
    return Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  }

  it('mostra o carregamento enquanto busca as marcas', () => {
    marcaService.listar.and.returnValue(new Subject<MinhasMarcas>());
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Carregando marcas...');
  });

  it('lista as marcas com nome, descrição e o uso do limite', () => {
    iniciar({ marcas: [alfa, beta], limite: 5 });

    const texto = elemento().textContent ?? '';
    expect(texto).toContain('Alfa');
    expect(texto).toContain('Descrição da Alfa');
    expect(texto).toContain('Beta');
    expect(texto).toContain('Sem descrição.');
    expect(elemento().querySelector('[data-testid="uso-marcas"]')?.textContent?.trim()).toBe('2/5 marcas');
  });

  it('mostra o estado vazio com atalho para criar a primeira marca', () => {
    iniciar({ marcas: [], limite: 2 });

    expect(elemento().textContent).toContain('Você ainda não tem marcas');
    expect(elemento().querySelector('a[href="/painel/marcas/nova"]')).not.toBeNull();
  });

  it('oferece criar nova marca enquanto há vaga', () => {
    iniciar({ marcas: [alfa], limite: 2 });

    expect(elemento().querySelector('header a[href="/painel/marcas/nova"]')).not.toBeNull();
    expect(elemento().querySelector('#aviso-limite')).toBeNull();
  });

  it('bloqueia a criação e avisa quando o limite foi atingido', () => {
    iniciar({ marcas: [alfa, beta], limite: 2 });

    expect(elemento().querySelector('header a[href="/painel/marcas/nova"]')).toBeNull();
    expect(botao('Nova marca').disabled).toBeTrue();
    expect(elemento().querySelector('#aviso-limite')?.textContent).toContain('limite de 2 marcas');
  });

  it('tem o link de edição de cada marca', () => {
    iniciar({ marcas: [alfa], limite: 2 });

    expect(elemento().querySelector('a[href="/painel/marcas/1"]')).not.toBeNull();
  });

  it('tem os links para as lojas e os produtos de cada marca', () => {
    iniciar({ marcas: [alfa], limite: 2 });

    expect(elemento().querySelector('a[href="/painel/marcas/1/lojas"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/painel/marcas/1/produtos"]')).not.toBeNull();
  });

  it('mostra erro e permite tentar de novo quando a listagem falha', () => {
    marcaService.listar.and.returnValues(throwError(() => new Error('falha')), of({ marcas: [alfa], limite: 2 }));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar suas marcas');

    botao('Tentar de novo').click();
    fixture.detectChanges();

    expect(marcaService.listar).toHaveBeenCalledTimes(2);
    expect(elemento().textContent).toContain('Alfa');
    expect(elemento().querySelector('[role="alert"]')).toBeNull();
  });

  it('pede confirmação antes de excluir e permite cancelar', () => {
    iniciar({ marcas: [alfa], limite: 2 });

    botao('Excluir').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alertdialog"]')?.textContent).toContain('Excluir a marca');
    expect(marcaService.excluir).not.toHaveBeenCalled();

    botao('Cancelar').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alertdialog"]')).toBeNull();
    expect(elemento().textContent).toContain('Alfa');
  });

  it('exclui a marca confirmada e a remove da lista', () => {
    iniciar({ marcas: [alfa, beta], limite: 2 });
    marcaService.excluir.and.returnValue(of(undefined));

    botao('Excluir').click();
    fixture.detectChanges();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(marcaService.excluir).toHaveBeenCalledWith('1');
    expect(elemento().textContent).not.toContain('Descrição da Alfa');
    expect(elemento().textContent).toContain('Beta');
    expect(elemento().querySelector('[data-testid="uso-marcas"]')?.textContent?.trim()).toBe('1/2 marcas');
  });

  it('mantém a marca e mostra o erro quando a exclusão falha', () => {
    iniciar({ marcas: [alfa], limite: 2 });
    marcaService.excluir.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'NAO_ENCONTRADO', detail: 'Marca não encontrada.' } })),
    );

    botao('Excluir').click();
    fixture.detectChanges();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Alfa');
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Marca não encontrada.');
  });

  it('desabilita os botões enquanto exclui', () => {
    iniciar({ marcas: [alfa], limite: 2 });
    marcaService.excluir.and.returnValue(new Subject<void>());

    botao('Excluir').click();
    fixture.detectChanges();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(botao('Excluindo...').disabled).toBeTrue();
    expect(botao('Cancelar').disabled).toBeTrue();
  });
});

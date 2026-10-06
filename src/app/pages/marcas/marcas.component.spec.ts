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

  function botaoDoMenu(nomeDaMarca: string): HTMLButtonElement {
    return elemento().querySelector<HTMLButtonElement>(`button[aria-label="Opções da marca ${nomeDaMarca}"]`)!;
  }

  function abrirMenu(nomeDaMarca = 'Alfa'): void {
    botaoDoMenu(nomeDaMarca).click();
    fixture.detectChanges();
  }

  function itemDoMenu(rotulo: string): HTMLElement {
    return Array.from(elemento().querySelectorAll<HTMLElement>('[role="menuitem"]')).find((i) => i.textContent?.trim() === rotulo)!;
  }

  function pedirExclusao(nomeDaMarca = 'Alfa'): void {
    abrirMenu(nomeDaMarca);
    itemDoMenu('Excluir').click();
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

  describe('menu de opções (três pontinhos)', () => {
    it('cada marca tem o botão do menu no canto, fechado e com atributos de acessibilidade', () => {
      iniciar({ marcas: [alfa, beta], limite: 5 });

      expect(elemento().querySelectorAll('button[aria-haspopup="menu"]').length).toBe(2);
      const botaoAlfa = botaoDoMenu('Alfa');
      expect(botaoAlfa.getAttribute('aria-expanded')).toBe('false');
      expect(botaoAlfa.getAttribute('aria-label')).toBe('Opções da marca Alfa');
      expect(botaoAlfa.closest('li')?.textContent).toContain('Alfa');
      expect(elemento().querySelector('[role="menu"]')).toBeNull();
    });

    it('Editar e Excluir não aparecem soltos no cartão, só dentro do menu', () => {
      iniciar({ marcas: [alfa], limite: 2 });

      expect(elemento().querySelector('a[href="/painel/marcas/1"]')).toBeNull();
      expect(Array.from(elemento().querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Excluir')).toBeFalse();

      abrirMenu();

      const menu = elemento().querySelector('[role="menu"]')!;
      expect(menu.querySelector('a[href="/painel/marcas/1"]')?.textContent?.trim()).toBe('Editar');
      expect(menu.querySelector('button')?.textContent?.trim()).toBe('Excluir');
    });

    it('abrir marca o botão como expandido e liga o menu ao botão', () => {
      iniciar({ marcas: [alfa], limite: 2 });

      abrirMenu();

      expect(botaoDoMenu('Alfa').getAttribute('aria-expanded')).toBe('true');
      expect(botaoDoMenu('Alfa').getAttribute('aria-controls')).toBe('menu-1');
      expect(elemento().querySelector('#menu-1')?.getAttribute('aria-labelledby')).toBe('menu-botao-1');
    });

    it('clicar de novo no botão fecha o menu', () => {
      iniciar({ marcas: [alfa], limite: 2 });

      abrirMenu();
      abrirMenu();

      expect(elemento().querySelector('[role="menu"]')).toBeNull();
      expect(botaoDoMenu('Alfa').getAttribute('aria-expanded')).toBe('false');
    });

    it('só um menu fica aberto por vez', () => {
      iniciar({ marcas: [alfa, beta], limite: 5 });

      abrirMenu('Alfa');
      abrirMenu('Beta');

      expect(elemento().querySelectorAll('[role="menu"]').length).toBe(1);
      expect(elemento().querySelector('#menu-2')).not.toBeNull();
      expect(elemento().querySelector('#menu-1')).toBeNull();
    });

    it('clicar fora fecha o menu', () => {
      iniciar({ marcas: [alfa], limite: 2 });
      abrirMenu();

      document.body.click();
      fixture.detectChanges();

      expect(elemento().querySelector('[role="menu"]')).toBeNull();
    });

    it('Escape fecha o menu e devolve o foco ao botão', () => {
      iniciar({ marcas: [alfa], limite: 2 });
      abrirMenu();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(elemento().querySelector('[role="menu"]')).toBeNull();
      expect(document.activeElement).toBe(botaoDoMenu('Alfa'));
    });

    it('Escape sem menu aberto não faz nada', () => {
      iniciar({ marcas: [alfa], limite: 2 });

      expect(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))).not.toThrow();
    });

    it('as setas movem o foco entre os itens e dão a volta', () => {
      iniciar({ marcas: [alfa], limite: 2 });
      abrirMenu();
      const [editar, excluir] = Array.from(elemento().querySelectorAll<HTMLElement>('[role="menuitem"]'));
      editar.focus();

      const menu = elemento().querySelector('[role="menu"]')!;
      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(excluir);

      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(editar);

      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(document.activeElement).toBe(excluir);

      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
      expect(document.activeElement).toBe(editar);

      menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      expect(document.activeElement).toBe(excluir);
    });

    it('Tab fecha o menu', () => {
      iniciar({ marcas: [alfa], limite: 2 });
      abrirMenu();

      elemento().querySelector('[role="menu"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
      fixture.detectChanges();

      expect(elemento().querySelector('[role="menu"]')).toBeNull();
    });

    it('escolher Excluir fecha o menu e abre a confirmação da marca certa', () => {
      iniciar({ marcas: [alfa, beta], limite: 5 });

      pedirExclusao('Beta');

      expect(elemento().querySelector('[role="menu"]')).toBeNull();
      const dialogos = elemento().querySelectorAll('[role="alertdialog"]');
      expect(dialogos.length).toBe(1);
      expect(dialogos[0].textContent).toContain('Beta');
    });

    it('as ações de navegação continuam visíveis no cartão sem abrir o menu', () => {
      iniciar({ marcas: [alfa], limite: 2 });

      ['resumo', 'lojas', 'produtos', 'promotores', 'reposicoes'].forEach((pagina) =>
        expect(elemento().querySelector(`a[href="/painel/marcas/1/${pagina}"]`)).withContext(pagina).not.toBeNull(),
      );
    });
  });

  it('tem os links para as lojas e os produtos de cada marca', () => {
    iniciar({ marcas: [alfa], limite: 2 });

    expect(elemento().querySelector('a[href="/painel/marcas/1/lojas"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/painel/marcas/1/produtos"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/painel/marcas/1/resumo"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/painel/marcas/1/promotores"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/painel/marcas/1/reposicoes"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/painel/relatorios?marca=1"]')).not.toBeNull();
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

    pedirExclusao();

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

    pedirExclusao();
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

    pedirExclusao();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Alfa');
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Marca não encontrada.');
  });

  it('desabilita os botões enquanto exclui', () => {
    iniciar({ marcas: [alfa], limite: 2 });
    marcaService.excluir.and.returnValue(new Subject<void>());

    pedirExclusao();
    botao('Excluir').click();
    fixture.detectChanges();

    expect(botao('Excluindo...').disabled).toBeTrue();
    expect(botao('Cancelar').disabled).toBeTrue();
  });
});

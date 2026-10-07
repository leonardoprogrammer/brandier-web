import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TemaService } from '../../services/tema.service';
import { TemaToggleComponent } from './tema-toggle.component';

describe('TemaToggleComponent', () => {
  let fixture: ComponentFixture<TemaToggleComponent>;
  let temaService: jasmine.SpyObj<TemaService>;

  beforeEach(async () => {
    temaService = jasmine.createSpyObj<TemaService>('TemaService', ['definir']);
    Object.defineProperty(temaService, 'tema', { value: signal('sistema').asReadonly() });
    await TestBed.configureTestingModule({
      imports: [TemaToggleComponent],
      providers: [{ provide: TemaService, useValue: temaService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TemaToggleComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const gatilho = (): HTMLButtonElement => elemento().querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;
  const painel = (): HTMLElement => elemento().querySelector<HTMLElement>('.tema-painel')!;
  const menu = (): HTMLElement => elemento().querySelector<HTMLElement>('[role="menu"]')!;
  const opcao = (rotulo: string): HTMLButtonElement => elemento().querySelector<HTMLButtonElement>(`button[aria-label="${rotulo}"]`)!;

  function abrir(): void {
    gatilho().click();
    fixture.detectChanges();
  }

  it('mostra só o ícone do tema atual no botão, com o painel fechado', () => {
    expect(gatilho().getAttribute('aria-label')).toBe('Tema: Sistema');
    expect(gatilho().getAttribute('aria-expanded')).toBe('false');
    expect(painel().classList).toContain('hidden');
  });

  it('clicar no botão abre o painel com as três opções e foca a primeira', (done) => {
    abrir();

    expect(gatilho().getAttribute('aria-expanded')).toBe('true');
    expect(painel().classList).not.toContain('hidden');
    expect(opcao('Tema do sistema')).toBeDefined();
    expect(opcao('Tema claro')).toBeDefined();
    expect(opcao('Tema escuro')).toBeDefined();
    setTimeout(() => {
      expect(document.activeElement).toBe(opcao('Tema do sistema'));
      done();
    });
  });

  it('clicar de novo no botão fecha o painel', () => {
    abrir();

    gatilho().click();
    fixture.detectChanges();

    expect(painel().classList).toContain('hidden');
  });

  it('escolher um tema chama o serviço e fecha o painel', () => {
    abrir();

    opcao('Tema escuro').click();
    fixture.detectChanges();

    expect(temaService.definir).toHaveBeenCalledOnceWith('escuro');
    expect(painel().classList).toContain('hidden');
  });

  it('clicar fora fecha o painel', () => {
    abrir();

    document.body.click();
    fixture.detectChanges();

    expect(painel().classList).toContain('hidden');
  });

  it('Escape fecha o painel e devolve o foco ao botão', () => {
    abrir();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(painel().classList).toContain('hidden');
    expect(document.activeElement).toBe(gatilho());
  });

  it('seta para a direita move o foco entre as opções', () => {
    abrir();
    opcao('Tema do sistema').focus();

    menu().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));

    expect(document.activeElement).toBe(opcao('Tema claro'));
  });

  it('por padrão o painel fica centralizado sob o botão', () => {
    expect(painel().className).toContain('left-1/2');
    expect(painel().className).toContain('-translate-x-1/2');
    expect(painel().className).not.toContain('right-0');
  });

  it('com abrirAEsquerdaNoMobile, o painel abre à esquerda no mobile e centralizado a partir do sm:', () => {
    fixture.componentRef.setInput('abrirAEsquerdaNoMobile', true);
    fixture.detectChanges();

    expect(painel().className).toContain('right-0');
    expect(painel().className).toContain('sm:left-1/2');
    expect(painel().className).toContain('sm:-translate-x-1/2');
  });
});

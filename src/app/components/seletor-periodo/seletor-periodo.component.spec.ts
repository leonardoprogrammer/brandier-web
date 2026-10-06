import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Periodo } from '../../models/painel.model';
import { SeletorPeriodoComponent } from './seletor-periodo.component';

describe('SeletorPeriodoComponent', () => {
  let fixture: ComponentFixture<SeletorPeriodoComponent>;
  let emitidos: Periodo[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SeletorPeriodoComponent] }).compileComponents();
    fixture = TestBed.createComponent(SeletorPeriodoComponent);
    emitidos = [];
    fixture.componentInstance.periodoAlterado.subscribe((periodo) => emitidos.push(periodo));
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const botao = (texto: string): HTMLButtonElement =>
    Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;

  function digitar(id: string, valor: string): void {
    const campo = elemento().querySelector<HTMLInputElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('marca 30 dias como selecionado por padrão', () => {
    expect(botao('30 dias').getAttribute('aria-pressed')).toBe('true');
    expect(botao('7 dias').getAttribute('aria-pressed')).toBe('false');
    expect(emitidos).toEqual([]);
  });

  it('emite o período dos últimos N dias ao escolher uma opção e destaca a escolhida', () => {
    botao('7 dias').click();
    fixture.detectChanges();

    expect(emitidos.length).toBe(1);
    const dias = (new Date(emitidos[0].ate).getTime() - new Date(emitidos[0].de).getTime()) / 86_400_000;
    expect(Math.round(dias)).toBe(7);
    expect(botao('7 dias').getAttribute('aria-pressed')).toBe('true');
    expect(botao('30 dias').getAttribute('aria-pressed')).toBe('false');
  });

  it('mostra os campos de data ao escolher "Personalizado"', () => {
    expect(elemento().querySelector('#periodo-de')).toBeNull();

    botao('Personalizado').click();
    fixture.detectChanges();

    expect(elemento().querySelector('#periodo-de')).not.toBeNull();
    expect(elemento().querySelector('#periodo-ate')).not.toBeNull();
    expect(botao('Personalizado').getAttribute('aria-pressed')).toBe('true');
  });

  it('emite o intervalo personalizado incluindo o último dia', () => {
    botao('Personalizado').click();
    fixture.detectChanges();
    digitar('periodo-de', '2026-03-01');
    digitar('periodo-ate', '2026-03-10');

    botao('Aplicar').click();
    fixture.detectChanges();

    expect(emitidos.length).toBe(1);
    expect(new Date(emitidos[0].de).getTime()).toBe(new Date(2026, 2, 1).getTime());
    expect(new Date(emitidos[0].ate).getTime()).toBe(new Date(2026, 2, 11).getTime());
    expect(elemento().querySelector('[role="alert"]')).toBeNull();
  });

  it('mostra erro e não emite quando as datas são inválidas', () => {
    botao('Personalizado').click();
    fixture.detectChanges();
    digitar('periodo-de', '2026-03-10');
    digitar('periodo-ate', '2026-03-01');

    botao('Aplicar').click();
    fixture.detectChanges();

    expect(emitidos).toEqual([]);
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('366 dias');
  });

  it('mostra erro quando a data inicial está vazia', () => {
    botao('Personalizado').click();
    fixture.detectChanges();

    botao('Aplicar').click();
    fixture.detectChanges();

    expect(emitidos).toEqual([]);
    expect(elemento().querySelector('[role="alert"]')).not.toBeNull();
  });

  it('oferece "Todo o período" só quando permitido e emite sem datas', () => {
    expect(Array.from(elemento().querySelectorAll('button')).some((b) => b.textContent?.trim() === 'Todo o período')).toBeFalse();

    fixture.componentRef.setInput('permitirTodo', true);
    fixture.detectChanges();
    let semDatas = 0;
    fixture.componentInstance.todoPeriodo.subscribe(() => semDatas++);
    botao('Todo o período').click();
    fixture.detectChanges();

    expect(semDatas).toBe(1);
    expect(emitidos).toEqual([]);
    expect(botao('Todo o período').getAttribute('aria-pressed')).toBe('true');
    expect(botao('30 dias').getAttribute('aria-pressed')).toBe('false');
  });

  it('limpa o erro ao escolher uma opção pronta depois', () => {
    botao('Personalizado').click();
    fixture.detectChanges();
    botao('Aplicar').click();
    fixture.detectChanges();

    botao('90 dias').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')).toBeNull();
    expect(emitidos.length).toBe(1);
  });
});

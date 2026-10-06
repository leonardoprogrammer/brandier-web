import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SenhaRequisitosComponent } from './senha-requisitos.component';

describe('SenhaRequisitosComponent', () => {
  let fixture: ComponentFixture<SenhaRequisitosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SenhaRequisitosComponent] }).compileComponents();
    fixture = TestBed.createComponent(SenhaRequisitosComponent);
  });

  function itens(senha: string): string[] {
    fixture.componentRef.setInput('senha', senha);
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li')).map((li) => li.textContent ?? '');
  }

  it('mostra os três requisitos como pendentes quando a senha está vazia', () => {
    const lista = itens('');

    expect(lista.length).toBe(3);
    lista.forEach((texto) => expect(texto).toContain('(pendente)'));
  });

  it('marca como atendidos apenas os requisitos cumpridos', () => {
    const lista = itens('abcdefgh');

    expect(lista[0]).toContain('(atendido)');
    expect(lista[1]).toContain('(atendido)');
    expect(lista[2]).toContain('(pendente)');
  });

  it('marca todos como atendidos com uma senha válida', () => {
    itens('Senha1234').forEach((texto) => expect(texto).toContain('(atendido)'));
  });

  it('reconhece letras acentuadas', () => {
    expect(itens('çãé')[1]).toContain('(atendido)');
  });
});

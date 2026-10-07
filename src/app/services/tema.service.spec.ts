import { TestBed } from '@angular/core/testing';

import { TemaService } from './tema.service';

describe('TemaService', () => {
  beforeEach(() => {
    localStorage.removeItem('brandier-tema');
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.removeItem('brandier-tema');
    document.documentElement.classList.remove('dark');
  });

  function criarServico(): TemaService {
    TestBed.configureTestingModule({});
    return TestBed.inject(TemaService);
  }

  it('usa "sistema" como padrão quando nada foi salvo', () => {
    expect(criarServico().tema()).toBe('sistema');
  });

  it('ignora um valor inválido salvo e usa "sistema"', () => {
    localStorage.setItem('brandier-tema', 'inexistente');

    expect(criarServico().tema()).toBe('sistema');
  });

  it('carrega o tema salvo anteriormente', () => {
    localStorage.setItem('brandier-tema', 'escuro');

    expect(criarServico().tema()).toBe('escuro');
  });

  it('definir muda o sinal, salva no armazenamento e aplica a classe dark', () => {
    const servico = criarServico();

    servico.definir('escuro');

    expect(servico.tema()).toBe('escuro');
    expect(localStorage.getItem('brandier-tema')).toBe('escuro');
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
  });

  it('definir "claro" remove a classe dark', () => {
    const servico = criarServico();
    servico.definir('escuro');

    servico.definir('claro');

    expect(document.documentElement.classList.contains('dark')).toBeFalse();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComoFuncionaConteudoComponent, PASSOS, PERGUNTAS } from './como-funciona-conteudo.component';

describe('ComoFuncionaConteudoComponent', () => {
  let fixture: ComponentFixture<ComoFuncionaConteudoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ComoFuncionaConteudoComponent] }).compileComponents();
    fixture = TestBed.createComponent(ComoFuncionaConteudoComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('tem o título da página', () => {
    expect(elemento().querySelector('h1')?.textContent).toContain('Como funciona');
  });

  it('lista o passo a passo completo em ordem numerada', () => {
    const itens = elemento().querySelectorAll('[data-testid="passos"] li');

    expect(itens.length).toBe(PASSOS.length);
    expect(itens[0].textContent).toContain('1');
    expect(itens[0].textContent).toContain('Crie sua conta e confirme o e-mail');
    expect(itens[itens.length - 1].textContent).toContain('Acompanhe no painel e nos relatórios');
    expect(elemento().querySelector('[data-testid="passos"]')?.tagName).toBe('OL');
  });

  it('o fluxo cobre conta, marca, lojas e produtos, promotores, reposições e acompanhamento', () => {
    const titulos = PASSOS.map((passo) => passo.titulo.toLowerCase()).join(' | ');

    ['conta', 'marca', 'lojas e produtos', 'promotores', 'reposições', 'painel'].forEach((termo) =>
      expect(titulos).withContext(termo).toContain(termo),
    );
  });

  it('explica que gestor e promotor são papéis por marca e não tipos de conta', () => {
    const texto = elemento().textContent ?? '';

    expect(texto).toContain('único tipo de conta');
    expect(texto).toContain('papéis em cada marca');
  });

  it('mostra os limites da demonstração', () => {
    const limites = elemento().querySelector('[data-testid="limites"]')?.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(limites).toContain('2 marcas');
    expect(limites).toContain('5 lojas');
    expect(limites).toContain('10 produtos');
    expect(limites).toContain('5 promotores');
  });

  it('explica a regra de 24 horas de edição do promotor e a liberdade do gestor', () => {
    const texto = elemento().textContent?.replace(/\s+/g, ' ') ?? '';

    expect(texto).toContain('O gestor edita e exclui qualquer reposição da marca');
    expect(texto).toContain('24 horas');
  });

  it('as perguntas frequentes são um acordeão acessível, fechado no início', () => {
    const detalhes = elemento().querySelectorAll<HTMLDetailsElement>('[data-testid="perguntas"] details');

    expect(detalhes.length).toBe(PERGUNTAS.length);
    detalhes.forEach((item) => {
      expect(item.open).toBeFalse();
      expect(item.querySelector('summary')).not.toBeNull();
    });
  });

  it('abre e fecha uma pergunta pelo resumo', () => {
    const primeira = elemento().querySelector<HTMLDetailsElement>('[data-testid="perguntas"] details')!;

    primeira.open = true;
    expect(primeira.open).toBeTrue();

    primeira.open = false;
    expect(primeira.open).toBeFalse();
  });

  it('as perguntas cobrem os temas combinados', () => {
    const perguntas = PERGUNTAS.map((item) => item.pergunta.toLowerCase()).join(' | ');

    ['limites', 'gestor para ser promotor', 'editar', 'senha', 'dados', 'convite', 'conta'].forEach((termo) =>
      expect(perguntas).withContext(termo).toContain(termo),
    );
  });

  it('todas as perguntas têm resposta não vazia', () => {
    PERGUNTAS.forEach((item) => expect(item.resposta.trim().length).withContext(item.pergunta).toBeGreaterThan(20));
  });

  it('a resposta sobre editar bate com a regra: gestor sem prazo, promotor 24 horas', () => {
    const resposta = PERGUNTAS.find((item) => item.pergunta.includes('editar'))!.resposta;

    expect(resposta).toContain('sem prazo');
    expect(resposta).toContain('24 horas');
  });
});
